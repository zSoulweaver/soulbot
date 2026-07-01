import { Buffer } from 'node:buffer'
import { eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { settings, spotifyPlaylistCache, spotifyTokens } from '~~/server/database/schema'
import { botLogger } from '~~/server/utils/logger'
import { getAppSettingsSync } from '~~/server/utils/settings'

let cachedSpotifyToken: typeof spotifyTokens.$inferSelect | null = null

export interface CachedPlaylistTrack {
	playlistId: string
	trackId: string
	uri: string
	title: string
	artist: string
	durationMs: number
	albumArt: string | null
}

interface PlaylistCache {
	playlistId: string
	tracks: CachedPlaylistTrack[]
	trackIdsSet: Set<string>
	timestamp: number
}

let targetPlaylistCache: PlaylistCache | null = null

export async function getSpotifyToken(forceRefresh = false) {
	if (!cachedSpotifyToken || forceRefresh) {
		const res = await db
			.select()
			.from(spotifyTokens)
			.where(eq(spotifyTokens.id, 'streamer'))
			.then(res => res[0])
		cachedSpotifyToken = res || null
	}
	return cachedSpotifyToken
}

export async function refreshSpotifyToken() {
	const token = await getSpotifyToken(true)
	if (!token) {
		throw new Error('Spotify token not loaded')
	}

	const config = useRuntimeConfig()
	const clientId = config.spotifyClientId
	const clientSecret = config.spotifyClientSecret

	if (!clientId || !clientSecret) {
		throw new Error('Spotify clientId or clientSecret missing in runtime config')
	}

	const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

	try {
		const res = await $fetch<any>('https://accounts.spotify.com/api/token', {
			method: 'POST',
			headers: {
				'Authorization': `Basic ${basicAuth}`,
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: new URLSearchParams({
				grant_type: 'refresh_token',
				refresh_token: token.refreshToken,
			}),
		})

		const updated = {
			accessToken: res.access_token,
			expiresIn: res.expires_in,
			obtainmentTimestamp: Date.now(),
			// Only update refresh token if a new one is returned
			refreshToken: res.refresh_token || token.refreshToken,
			scope: res.scope || token.scope,
		}

		await db
			.update(spotifyTokens)
			.set(updated)
			.where(eq(spotifyTokens.id, 'streamer'))

		cachedSpotifyToken = { ...token, ...updated }
		return cachedSpotifyToken
	}
	catch (err: any) {
		botLogger.error({ err }, 'Failed to refresh Spotify access token')
		throw err
	}
}

export async function getValidSpotifyToken() {
	let token = await getSpotifyToken()
	if (!token)
		return null

	const isExpired = token.obtainmentTimestamp + (token.expiresIn! * 1000) - 60000 < Date.now()
	if (isExpired) {
		token = await refreshSpotifyToken()
	}

	return token
}

export interface CurrentlyPlayingTrack {
	id: string
	uri: string
	title: string
	artist: string
	link: string
	isPlaying: boolean
	contextUri?: string
	albumName?: string
	albumArt?: string
	progressMs?: number
	durationMs?: number
	timestamp?: number
}

let cachedCurrentlyPlaying: {
	data: CurrentlyPlayingTrack | null
	timestamp: number
} | null = null

let rateLimitResetTime = 0

export function isSpotifyRateLimited(): boolean {
	return Date.now() < rateLimitResetTime
}

export function getSpotifyRateLimitRemainingSeconds(): number {
	if (!isSpotifyRateLimited())
		return 0
	return Math.ceil((rateLimitResetTime - Date.now()) / 1000)
}

export async function getCurrentlyPlaying(forceRefresh = false): Promise<CurrentlyPlayingTrack | null> {
	if (isSpotifyRateLimited()) {
		botLogger.warn('[Spotify] Bypassing fetch due to active rate-limit cooldown')
		return cachedCurrentlyPlaying?.data || null
	}

	if (!forceRefresh && cachedCurrentlyPlaying && Date.now() - cachedCurrentlyPlaying.timestamp < 5000) {
		return cachedCurrentlyPlaying.data
	}

	const token = await getValidSpotifyToken()
	if (!token) {
		return null
	}

	try {
		const response = await $fetch<any>('https://api.spotify.com/v1/me/player/currently-playing', {
			headers: {
				Authorization: `Bearer ${token.accessToken}`,
			},
		})

		// Check if response is empty or 204 (status is represented by h3/ofetch or null checking)
		if (!response || !response.item) {
			cachedCurrentlyPlaying = { data: null, timestamp: Date.now() }
			return null
		}

		const item = response.item
		const isPlaying = response.is_playing === true

		const data = {
			id: item.id,
			uri: item.uri,
			title: item.name,
			artist: item.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist',
			link: item.external_urls?.spotify || '',
			isPlaying,
			contextUri: response.context?.uri || null,
			albumName: item.album?.name,
			albumArt: item.album?.images?.[0]?.url,
			progressMs: response.progress_ms,
			durationMs: item.duration_ms,
			timestamp: Date.now(),
		}

		cachedCurrentlyPlaying = { data, timestamp: Date.now() }
		return data
	}
	catch (err: any) {
		if (err.response?.status === 429) {
			const retryAfterHeader = err.response.headers?.get?.('retry-after') || err.response.headers?.['retry-after']
			const retryAfterSeconds = Number.parseInt(retryAfterHeader || '5', 10)
			rateLimitResetTime = Date.now() + (retryAfterSeconds * 1000)
			botLogger.error(`[Spotify] Received 429. Rate limit active. Throttling requests for ${retryAfterSeconds}s.`)
		}
		else {
			botLogger.error({ err, message: err?.message, stack: err?.stack }, '[Spotify] Failed to fetch currently playing')
		}
		return null
	}
}

export function clearSpotifyTokenCache() {
	cachedSpotifyToken = null
	cachedCurrentlyPlaying = null
	rateLimitResetTime = 0
	targetPlaylistCache = null
}

export async function getSpotifyUserId(): Promise<string | null> {
	const token = await getValidSpotifyToken()
	if (!token)
		return null
	try {
		const res = await $fetch<any>('https://api.spotify.com/v1/me', {
			headers: {
				Authorization: `Bearer ${token.accessToken}`,
			},
		})
		return res.id
	}
	catch (err) {
		botLogger.error({ err }, '[Spotify] Failed to fetch Spotify user profile')
		return null
	}
}

export async function createQueuePlaylist(userId: string, name: string): Promise<string | null> {
	const token = await getValidSpotifyToken()
	if (!token)
		return null
	const { public: { botName } } = useRuntimeConfig()
	try {
		const res = await $fetch<any>(`https://api.spotify.com/v1/users/${userId}/playlists`, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${token.accessToken}`,
				'Content-Type': 'application/json',
			},
			body: {
				name,
				description: `Twitch chat song requests managed by ${botName}`,
				public: false,
			},
		})
		return res.id
	}
	catch (err) {
		botLogger.error({ err }, `[Spotify] Failed to create playlist ${name}`)
		return null
	}
}

export async function addTracksToPlaylist(playlistId: string, trackUris: string[], position?: number): Promise<boolean> {
	const token = await getValidSpotifyToken()
	if (!token)
		return false
	try {
		await $fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${token.accessToken}`,
				'Content-Type': 'application/json',
			},
			body: {
				uris: trackUris,
				...(position !== undefined ? { position } : {}),
			},
		})
		return true
	}
	catch (err: any) {
		botLogger.error({ err: err?.data || err }, `[Spotify] Failed to add tracks to playlist ${playlistId}`)
		return false
	}
}

export async function addTrackToPlaylist(playlistId: string, trackUri: string, position?: number): Promise<boolean> {
	return addTracksToPlaylist(playlistId, [trackUri], position)
}

export async function resumePlaylistWithOffset(trackUri: string): Promise<boolean> {
	const appSettings = getAppSettingsSync()
	if (!appSettings.spotifyRequestPlaylistId)
		return false

	const token = await getValidSpotifyToken()
	if (!token)
		return false

	try {
		await $fetch('https://api.spotify.com/v1/me/player/play', {
			method: 'PUT',
			headers: {
				'Authorization': `Bearer ${token.accessToken}`,
				'Content-Type': 'application/json',
			},
			body: {
				context_uri: `spotify:playlist:${appSettings.spotifyRequestPlaylistId}`,
				offset: { uri: trackUri },
			},
		})
		botLogger.info(`[Spotify Queue] Resumed playlist context with offset to track: ${trackUri}`)
		return true
	}
	catch (err: any) {
		botLogger.error({ err: err?.data || err }, `[Spotify Queue] Failed to resume playlist with offset`)
		return false
	}
}

export async function removeTrackFromPlaylist(playlistId: string, trackUri: string): Promise<boolean> {
	const token = await getValidSpotifyToken()
	if (!token)
		return false
	try {
		await $fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
			method: 'DELETE',
			headers: {
				'Authorization': `Bearer ${token.accessToken}`,
				'Content-Type': 'application/json',
			},
			body: {
				tracks: [{ uri: trackUri }],
			},
		})
		return true
	}
	catch (err: any) {
		botLogger.error({ err: err?.data || err }, `[Spotify] Failed to remove track ${trackUri} from playlist ${playlistId}`)
		return false
	}
}

export async function clearPlaylist(playlistId: string): Promise<boolean> {
	const token = await getValidSpotifyToken()
	if (!token)
		return false
	try {
		await $fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
			method: 'PUT',
			headers: {
				'Authorization': `Bearer ${token.accessToken}`,
				'Content-Type': 'application/json',
			},
			body: {
				uris: [],
			},
		})
		return true
	}
	catch (err: any) {
		botLogger.error({ err: err?.data || err }, `[Spotify] Failed to clear playlist ${playlistId}`)
		return false
	}
}

export interface PlaylistTrackInfo {
	id: string
	uri: string
	title: string
	artist: string
	durationMs: number
	explicit: boolean
	albumArt: string | null
}

export async function getPlaylistTracks(playlistId: string): Promise<PlaylistTrackInfo[] | null> {
	const token = await getValidSpotifyToken()
	if (!token)
		return null
	try {
		const res = await $fetch<any>(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`, {
			headers: {
				Authorization: `Bearer ${token.accessToken}`,
			},
		})
		return res.items.map((item: any) => {
			const track = item.track
			return {
				id: track.id,
				uri: track.uri,
				title: track.name,
				artist: track.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist',
				durationMs: track.duration_ms,
				explicit: track.explicit === true,
				albumArt: track.album?.images?.[0]?.url || null,
			}
		})
	}
	catch (err) {
		botLogger.error({ err }, `[Spotify] Failed to fetch tracks for playlist ${playlistId}`)
		return null
	}
}

export async function getTrackDetails(trackId: string): Promise<PlaylistTrackInfo | null> {
	const token = await getValidSpotifyToken()
	if (!token)
		return null
	try {
		const track = await $fetch<any>(`https://api.spotify.com/v1/tracks/${trackId}`, {
			headers: {
				Authorization: `Bearer ${token.accessToken}`,
			},
		})
		return {
			id: track.id,
			uri: track.uri,
			title: track.name,
			artist: track.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist',
			durationMs: track.duration_ms,
			explicit: track.explicit === true,
			albumArt: track.album?.images?.[0]?.url || null,
		}
	}
	catch (err) {
		botLogger.error({ err }, `[Spotify] Failed to fetch track details for ${trackId}`)
		return null
	}
}

export async function searchTrack(query: string): Promise<PlaylistTrackInfo | null> {
	const token = await getValidSpotifyToken()
	if (!token)
		return null
	try {
		const res = await $fetch<any>('https://api.spotify.com/v1/search', {
			headers: {
				Authorization: `Bearer ${token.accessToken}`,
			},
			query: {
				q: query,
				type: 'track',
				limit: 1,
			},
		})

		const track = res.tracks?.items?.[0]
		if (!track)
			return null

		return {
			id: track.id,
			uri: track.uri,
			title: track.name,
			artist: track.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist',
			durationMs: track.duration_ms,
			explicit: track.explicit === true,
			albumArt: track.album?.images?.[0]?.url || null,
		}
	}
	catch (err) {
		botLogger.error({ err, query }, `[Spotify] Failed to search track for query: ${query}`)
		return null
	}
}

let isSyncing = false

export async function loadTargetPlaylistCache(playlistId: string): Promise<void> {
	if (!playlistId)
		return
	if (targetPlaylistCache && targetPlaylistCache.playlistId === playlistId)
		return

	try {
		const rows = await db
			.select()
			.from(spotifyPlaylistCache)
			.where(eq(spotifyPlaylistCache.playlistId, playlistId))

		const trackIdsSet = new Set(rows.map(r => r.trackId))
		targetPlaylistCache = {
			playlistId,
			tracks: rows,
			trackIdsSet,
			timestamp: Date.now(),
		}
		botLogger.info(`[Spotify Cache] Loaded ${rows.length} tracks from database for playlist ${playlistId}`)
	}
	catch (err) {
		botLogger.error({ err, playlistId }, '[Spotify Cache] Failed to load target playlist cache from database')
	}
}

export async function syncTargetPlaylist(playlistId: string, _force = false): Promise<void> {
	if (!playlistId)
		return
	if (isSyncing)
		return

	const token = await getValidSpotifyToken()
	if (!token)
		return

	isSyncing = true
	botLogger.info(`[Spotify Cache] Starting background sync for playlist ${playlistId}...`)

	try {
		const tracks: typeof spotifyPlaylistCache.$inferInsert[] = []
		const trackIdsSet = new Set<string>()
		let nextUrl: string | null = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?fields=items(track(id,uri,name,artists(name),duration_ms,album(images))),next&limit=50`

		while (nextUrl) {
			const syncResponse: any = await $fetch<any>(nextUrl, {
				headers: {
					Authorization: `Bearer ${token.accessToken}`,
				},
			})

			if (!syncResponse || !syncResponse.items)
				break

			for (const item of syncResponse.items) {
				const track = item.track
				if (track && track.id && track.uri) {
					if (!trackIdsSet.has(track.id)) {
						trackIdsSet.add(track.id)
						tracks.push({
							playlistId,
							trackId: track.id,
							uri: track.uri,
							title: track.name,
							artist: track.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist',
							durationMs: track.duration_ms,
							albumArt: track.album?.images?.[0]?.url || null,
						})
					}
				}
			}

			nextUrl = syncResponse.next
			if (nextUrl) {
				// Wait 1 second between requests to respect rate limits
				await new Promise(resolve => setTimeout(resolve, 1000))
			}
		}

		// Overwrite the cache in the database atomically
		db.transaction((tx) => {
			tx.delete(spotifyPlaylistCache).where(eq(spotifyPlaylistCache.playlistId, playlistId)).run()
			if (tracks.length > 0) {
				const chunkSize = 200
				for (let i = 0; i < tracks.length; i += chunkSize) {
					const chunk = tracks.slice(i, i + chunkSize)
					tx.insert(spotifyPlaylistCache).values(chunk).run()
				}
			}

			// Update last synced setting
			tx.insert(settings)
				.values({
					key: 'spotify.playlist.cache_synced_at',
					value: String(Date.now()),
					updatedAt: new Date(),
				})
				.onConflictDoUpdate({
					target: settings.key,
					set: {
						value: String(Date.now()),
						updatedAt: new Date(),
					},
				})
				.run()
		})

		targetPlaylistCache = {
			playlistId,
			tracks: tracks as CachedPlaylistTrack[],
			trackIdsSet,
			timestamp: Date.now(),
		}
		botLogger.info(`[Spotify Cache] Sync complete. Cached ${tracks.length} tracks for playlist ${playlistId}`)
	}
	catch (err) {
		botLogger.error({ err, playlistId }, '[Spotify Cache] Failed to sync target playlist')
	}
	finally {
		isSyncing = false
	}
}

export async function isTrackLiked(playlistId: string, trackId: string): Promise<boolean> {
	if (!playlistId || !trackId)
		return false
	await loadTargetPlaylistCache(playlistId)
	return targetPlaylistCache?.trackIdsSet.has(trackId) ?? false
}

export async function getTargetPlaylistTracks(playlistId: string): Promise<CachedPlaylistTrack[]> {
	if (!playlistId)
		return []
	await loadTargetPlaylistCache(playlistId)
	return targetPlaylistCache?.tracks || []
}

export async function addLikedTrackToCache(
	playlistId: string,
	track: { id: string, uri: string, title: string, artist: string, durationMs: number, albumArt: string | null },
): Promise<void> {
	if (!playlistId || !track)
		return
	await loadTargetPlaylistCache(playlistId)

	try {
		// Insert into SQLite DB
		await db.insert(spotifyPlaylistCache).values({
			playlistId,
			trackId: track.id,
			uri: track.uri,
			title: track.title,
			artist: track.artist,
			durationMs: track.durationMs,
			albumArt: track.albumArt,
		})

		// Add to memory cache
		if (targetPlaylistCache && targetPlaylistCache.playlistId === playlistId) {
			if (!targetPlaylistCache.trackIdsSet.has(track.id)) {
				targetPlaylistCache.trackIdsSet.add(track.id)
				targetPlaylistCache.tracks.push({
					playlistId,
					trackId: track.id,
					uri: track.uri,
					title: track.title,
					artist: track.artist,
					durationMs: track.durationMs,
					albumArt: track.albumArt,
				})
			}
		}
		botLogger.info(`[Spotify Cache] Added track "${track.title}" directly to cache for playlist ${playlistId}`)
	}
	catch (err) {
		botLogger.error({ err, trackId: track.id }, '[Spotify Cache] Failed to add liked track to database cache')
	}
}
