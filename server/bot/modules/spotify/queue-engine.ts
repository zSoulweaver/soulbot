import { and, asc, eq, or, sql } from 'drizzle-orm'
import { db } from '~~/server/database'
import { settings, spotifyQueue } from '~~/server/database/schema'
import { botLogger } from '~~/server/utils/logger'
import { getAppSettingsSync, refreshAppSettingsCache } from '~~/server/utils/settings'
import { addTracksToPlaylist, getCurrentlyPlaying, getPlaylistTracks, getValidSpotifyToken, playlistExists, removeTracksFromPlaylist } from '~~/server/utils/spotify'

let intervalId: any = null
let lastPlaylistSyncTime = 0
let lastUserQueueCount: number | null = null
let lastTrackId: string | null = null
let lastTrackProgress = 0

export function startSpotifyQueueEngine() {
	if (intervalId)
		return
	botLogger.info('[Spotify Queue] Starting queue engine loop...')
	intervalId = setInterval(tick, 10000)
}

export function stopSpotifyQueueEngine() {
	if (intervalId) {
		botLogger.info('[Spotify Queue] Stopping queue engine loop...')
		clearInterval(intervalId)
		intervalId = null
	}
}

export async function triggerQueueEngineTick() {
	botLogger.info('[Spotify Queue] Manual queue engine tick triggered')
	await tick()
}

export async function clearRequestPlaylistId() {
	try {
		await db.insert(settings)
			.values({
				key: 'spotify.request.playlist_id',
				value: '',
				updatedAt: new Date(),
			})
			.onConflictDoUpdate({
				target: settings.key,
				set: {
					value: '',
					updatedAt: new Date(),
				},
			})
		await db.insert(settings)
			.values({
				key: 'spotify.sr.enabled',
				value: 'false',
				updatedAt: new Date(),
			})
			.onConflictDoUpdate({
				target: settings.key,
				set: {
					value: 'false',
					updatedAt: new Date(),
				},
			})
		await refreshAppSettingsCache()
		botLogger.warn('[Spotify Queue] Cleared invalid/deleted request playlist ID and forcefully disabled song requests')
	}
	catch (err) {
		botLogger.error({ err }, '[Spotify Queue] Failed to clear invalid playlist ID and disable song requests')
	}
}

async function tick() {
	try {
		const appSettings = getAppSettingsSync()
		if (!appSettings.spotifySongRequestEnabled || !appSettings.spotifyRequestPlaylistId) {
			return
		}

		// Asynchronously refresh target playlist cache if target playlist is configured and cache is expired (30-minute TTL)
		if (appSettings.spotifyPlaylistTargetId) {
			const { syncTargetPlaylist, loadTargetPlaylistCache } = await import('~~/server/utils/spotify')
			await loadTargetPlaylistCache(appSettings.spotifyPlaylistTargetId)

			const lastSyncedSetting = await db
				.select()
				.from(settings)
				.where(eq(settings.key, 'spotify.playlist.cache_synced_at'))
				.then(res => res[0])

			const lastSynced = lastSyncedSetting ? Number(lastSyncedSetting.value) : 0
			if (!lastSynced || (Date.now() - lastSynced > 30 * 60 * 1000)) {
				syncTargetPlaylist(appSettings.spotifyPlaylistTargetId).catch(() => {})
			}
		}

		const token = await getValidSpotifyToken()
		if (!token)
			return

		// Sync the database queue with the Spotify playlist every 60 seconds
		const now = Date.now()
		if (now - lastPlaylistSyncTime > 60000) {
			lastPlaylistSyncTime = now
			const playlistTracks = await getPlaylistTracks(appSettings.spotifyRequestPlaylistId)
			if (playlistTracks) {
				const spotifyTrackIds = new Set(playlistTracks.map(t => t.id))
				const dbActiveTracks = await db
					.select()
					.from(spotifyQueue)
					.where(
						or(
							eq(spotifyQueue.status, 'playing'),
							eq(spotifyQueue.status, 'pending'),
						),
					)

				const toRemove = dbActiveTracks.filter((t) => {
					const trackIdStr = t.trackId.startsWith('spotify:track:') ? t.trackId.split(':').pop() : t.trackId
					return !spotifyTrackIds.has(trackIdStr!)
				})

				for (const item of toRemove) {
					await db.update(spotifyQueue)
						.set({ status: 'played' })
						.where(eq(spotifyQueue.id, item.id))
					botLogger.info(`[Spotify Queue] Cleaned up stale DB track not in Spotify playlist: ${item.title}`)
				}

				// 2. Remove lingering tracks from Spotify playlist (not in DB active queue)
				const dbActiveTrackIds = new Set(dbActiveTracks.map((t) => {
					return t.trackId.startsWith('spotify:track:') ? t.trackId.split(':').pop() : t.trackId
				}))

				const lingeringTrackUris: string[] = []
				for (const spotifyTrack of playlistTracks) {
					if (!dbActiveTrackIds.has(spotifyTrack.id)) {
						botLogger.info(`[Spotify Queue] Sync: Identified lingering/manual track to remove: ${spotifyTrack.title}`)
						lingeringTrackUris.push(spotifyTrack.uri)
					}
				}

				if (lingeringTrackUris.length > 0) {
					botLogger.info(`[Spotify Queue] Sync: Performing bulk removal of ${lingeringTrackUris.length} lingering tracks...`)
					await removeTracksFromPlaylist(appSettings.spotifyRequestPlaylistId, lingeringTrackUris)
				}
			}
		}

		// Get active queue items (statuses 'pending' or 'playing') ordered by ID (insertion order)
		const activeTracks = await db
			.select()
			.from(spotifyQueue)
			.where(
				or(
					eq(spotifyQueue.status, 'playing'),
					eq(spotifyQueue.status, 'pending'),
				),
			)
			.orderBy(
				sql`CASE WHEN ${spotifyQueue.status} = 'playing' THEN 0 ELSE 1 END`,
				sql`CASE WHEN ${spotifyQueue.requestedBy} = 'Fallback Playlist' THEN 1 ELSE 0 END`,
				asc(spotifyQueue.id),
			)

		const currentTrack = await getCurrentlyPlaying(true) // force refresh

		// Proactively queue fallback songs if active fallbacks count === 0
		const activeFallbacksCount = activeTracks.filter(t => t.requestedBy === 'Fallback Playlist').length
		if (activeFallbacksCount === 0 && appSettings.spotifyPlaylistTargetId) {
			const exists = await playlistExists(appSettings.spotifyRequestPlaylistId)
			if (!exists) {
				await clearRequestPlaylistId()
				return
			}

			const fallbackTracks = await getRandomTracksFromPlaylist(appSettings.spotifyPlaylistTargetId, 2)
			const newUris: string[] = []

			for (const track of fallbackTracks) {
				const isAlreadyActive = activeTracks.some((t) => {
					const activeId = t.trackId.includes(':') ? t.trackId.split(':').pop() : t.trackId
					const fallbackId = track.id.includes(':') ? track.id.split(':').pop() : track.id
					return activeId === fallbackId
				})

				if (isAlreadyActive) {
					continue
				}

				await db.insert(spotifyQueue).values({
					trackId: track.id,
					title: track.title,
					artist: track.artist,
					durationMs: track.durationMs,
					albumArt: track.albumArt,
					requestedBy: 'Fallback Playlist',
					pointsCost: 0,
					status: 'pending',
				})

				newUris.push(track.uri)

				activeTracks.push({
					id: 0,
					trackId: track.id,
					title: track.title,
					artist: track.artist,
					durationMs: track.durationMs,
					albumArt: track.albumArt,
					requestedBy: 'Fallback Playlist',
					pointsCost: 0,
					playedAt: null,
					createdAt: new Date(),
					status: 'pending',
				})
			}

			if (newUris.length > 0) {
				const added = await addTracksToPlaylist(appSettings.spotifyRequestPlaylistId, newUris)
				if (!added) {
					await handlePlaylistError()
				}
				else {
					botLogger.info(`[Spotify Queue] Autoplay: Added ${newUris.length} fallback songs to the bottom.`)
				}
			}
		}

		if (activeTracks.length > 0) {
			const playingItem = activeTracks.find(t => t.status === 'playing')

			// Context Guard: only synchronize/advance if the player is actively playing the request playlist
			// (Or if the context is missing, since some Spotify Connect devices don't report context URIs)
			const expectedPlaylistUri = `spotify:playlist:${appSettings.spotifyRequestPlaylistId}`
			const isPlayingRequestContext = !currentTrack || !currentTrack.contextUri || currentTrack.contextUri === expectedPlaylistUri

			if (currentTrack && isPlayingRequestContext) {
				lastTrackId = currentTrack.id
				lastTrackProgress = currentTrack.progressMs || 0
			}

			if (currentTrack && currentTrack.isPlaying) {
				if (isPlayingRequestContext) {
					// Find the index of the currently playing track in our active queue
					const matchedIndex = activeTracks.findIndex((t) => {
						const trackIdStr = t.trackId.startsWith('spotify:track:') ? t.trackId.split(':').pop() : t.trackId
						const currentIdStr = currentTrack.id
						return trackIdStr === currentIdStr
					})

					if (matchedIndex !== -1) {
						const matchedItem = activeTracks[matchedIndex]

						if (matchedItem) {
							// Transition to 'playing'
							if (matchedItem.status !== 'playing') {
								await db.update(spotifyQueue)
									.set({ status: 'playing', playedAt: Date.now() })
									.where(eq(spotifyQueue.id, matchedItem.id))
								botLogger.info(`[Spotify Queue] Active track transitioned to playing: ${matchedItem.title}`)
							}

							// Any items before the matched item have completed or been skipped!
							for (let i = 0; i < matchedIndex; i++) {
								const prevItem = activeTracks[i]
								if (prevItem) {
									await db.update(spotifyQueue)
										.set({ status: 'played' })
										.where(eq(spotifyQueue.id, prevItem.id))

									const trackUri = prevItem.trackId.startsWith('spotify:track:') ? prevItem.trackId : `spotify:track:${prevItem.trackId}`
									const removed = await removeTracksFromPlaylist(appSettings.spotifyRequestPlaylistId, [trackUri])
									if (!removed) {
										await handlePlaylistError()
									}
									else {
										botLogger.info(`[Spotify Queue] Cleaned up played song from playlist: ${prevItem.title}`)
									}
								}
							}
						}
					}
					else {
						// Current song is not in our queue.
						// Self-heal: if a song was playing but has run past its duration + buffer, mark it played and remove it.
						if (playingItem) {
							const durationBuffer = playingItem.durationMs + 60000
							const elapsed = Date.now() - (playingItem.playedAt || playingItem.createdAt.getTime())
							if (elapsed > durationBuffer) {
								botLogger.warn(`[Spotify Queue] Track "${playingItem.title}" playing duration exceeded. Advancing queue.`)
								await db.update(spotifyQueue)
									.set({ status: 'played' })
									.where(eq(spotifyQueue.id, playingItem.id))

								const trackUri = playingItem.trackId.startsWith('spotify:track:') ? playingItem.trackId : `spotify:track:${playingItem.trackId}`
								const removed = await removeTracksFromPlaylist(appSettings.spotifyRequestPlaylistId, [trackUri])
								if (!removed) {
									await handlePlaylistError()
								}
							}
						}
					}
				}
				else {
					// We are playing a different context (e.g. streamer switched playlist, or queue ended and autoplay started)
					// If we have an active playing item, and the player is playing a different track, we check if the song played to near completion.
					if (playingItem) {
						const playingItemCleanId = playingItem.trackId.startsWith('spotify:track:') ? playingItem.trackId.split(':').pop() : playingItem.trackId
						if (currentTrack.id !== playingItemCleanId) {
							const progress = lastTrackId === playingItemCleanId ? lastTrackProgress : 0
							const playCompletionThreshold = playingItem.durationMs * 0.8 // 80% completion threshold

							if (progress > playCompletionThreshold) {
								botLogger.info(`[Spotify Queue] Player switched context and track completed. Marking "${playingItem.title}" as played.`)
								await db.update(spotifyQueue)
									.set({ status: 'played' })
									.where(eq(spotifyQueue.id, playingItem.id))

								const trackUri = playingItem.trackId.startsWith('spotify:track:') ? playingItem.trackId : `spotify:track:${playingItem.trackId}`
								const removed = await removeTracksFromPlaylist(appSettings.spotifyRequestPlaylistId, [trackUri])
								if (!removed) {
									await handlePlaylistError()
								}
								else {
									botLogger.info(`[Spotify Queue] Cleaned up completed song: ${playingItem.title}`)
								}
							}
						}
					}
				}
			}
		}

		// Alert state transitions check for user-requested tracks
		const userTracks = await db
			.select()
			.from(spotifyQueue)
			.where(
				and(
					or(
						eq(spotifyQueue.status, 'playing'),
						eq(spotifyQueue.status, 'pending'),
					),
					sql`${spotifyQueue.requestedBy} != 'Fallback Playlist'`,
				),
			)
		const currentUserTracksCount = userTracks.length

		if (lastUserQueueCount === null) {
			lastUserQueueCount = currentUserTracksCount
		}
		else {
			if (currentUserTracksCount < lastUserQueueCount) {
				const { sendChannelChatMessage } = await import('~~/server/utils/chat')

				if (currentUserTracksCount === 5 && appSettings.spotifySongRequestAlertQueueLowEnabled) {
					await sendChannelChatMessage('spotify.sr.queue-low')
				}
				else if (currentUserTracksCount === 0 && appSettings.spotifySongRequestAlertQueueEmptyEnabled) {
					if (appSettings.spotifyPlaylistTargetId) {
						await sendChannelChatMessage('spotify.sr.queue-empty-autoplay')
					}
					else {
						await sendChannelChatMessage('spotify.sr.queue-empty-no-autoplay')
					}
				}
			}
			lastUserQueueCount = currentUserTracksCount
		}
	}
	catch (err: any) {
		botLogger.error({ err }, '[Spotify Queue] Error in queue engine tick')
	}
}

async function handlePlaylistError() {
	const appSettings = getAppSettingsSync()
	if (!appSettings.spotifyRequestPlaylistId)
		return

	const token = await getValidSpotifyToken()
	if (!token)
		return

	try {
		const exists = await playlistExists(appSettings.spotifyRequestPlaylistId)
		if (!exists) {
			await clearRequestPlaylistId()
		}
	}
	catch (err: any) {
		botLogger.error({ err }, '[Spotify Queue] Error checking playlist existence in handlePlaylistError')
	}
}

async function getRandomTracksFromPlaylist(playlistId: string, count = 5) {
	try {
		const { getTargetPlaylistTracks } = await import('~~/server/utils/spotify')
		const tracks = await getTargetPlaylistTracks(playlistId)

		if (!tracks || tracks.length === 0)
			return []

		const selected = []
		const available = [...tracks]

		for (let i = 0; i < count && available.length > 0; i++) {
			const randomIndex = Math.floor(Math.random() * available.length)
			const randomTrack = available.splice(randomIndex, 1)[0]
			if (randomTrack) {
				selected.push({
					id: randomTrack.trackId,
					uri: randomTrack.uri,
					title: randomTrack.title,
					artist: randomTrack.artist,
					durationMs: randomTrack.durationMs,
					albumArt: randomTrack.albumArt,
				})
			}
		}
		return selected
	}
	catch (err) {
		botLogger.error({ err, playlistId }, '[Spotify Queue] Failed to fetch random tracks from fallback playlist')
		return []
	}
}
