import { and, eq, sql } from 'drizzle-orm'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '~~/server/database'
import { settings, spotifyBlacklist, spotifyPlaylistCache, spotifyQueue, spotifyTokens, twitchTokens } from '~~/server/database/schema'
import { refreshAppSettingsCache } from '~~/server/utils/settings'
import { clearDatabase, simulateCommand } from '../helpers'
import { mockGetStreamInfo } from '../setup'

// Mocking global $fetch for tests
const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

describe('Bot Spotify Queue Commands Integration', () => {
	beforeEach(async () => {
		await clearDatabase()
		vi.clearAllMocks()
		mockGetStreamInfo.mockResolvedValue({ isOnline: true })
		// Insert Spotify tokens into database to bypass same-module mock limitations
		await db.insert(spotifyTokens).values({
			id: 'streamer',
			accessToken: 'access-123',
			refreshToken: 'refresh-123',
			expiresIn: 3600,
			obtainmentTimestamp: Date.now(),
			scope: 'user-read-currently-playing playlist-modify-public playlist-modify-private',
		})
		;(globalThis as any).__setMockSpotifyToken__({ id: 'streamer', accessToken: 'access-123', refreshToken: 'refresh-123' })
		;(globalThis as any).__setMockCurrentlyPlaying__(null)

		// Preset basic settings
		await db.insert(settings).values([
			{ key: 'spotify.sr.enabled', value: 'true', updatedAt: new Date() },
			{ key: 'spotify.sr.points_cost', value: '10', updatedAt: new Date() },
			{ key: 'spotify.request.playlist_id', value: 'playlist-123', updatedAt: new Date() },
		])
		await refreshAppSettingsCache()
	})

	it('should add track to queue, deduct points, and reply with success', async () => {
		mockFetch.mockImplementation(async (url: string) => {
			if (url.includes('/tracks/4PTG3Z6ehGkBF3zI7Y17p3')) {
				return {
					id: '4PTG3Z6ehGkBF3zI7Y17p3',
					uri: 'spotify:track:4PTG3Z6ehGkBF3zI7Y17p3',
					name: 'Blinding Lights',
					artists: [{ name: 'The Weeknd' }],
					duration_ms: 200000,
					explicit: false,
					album: { images: [{ url: 'https://art.com' }] },
				}
			}
			return { success: true }
		})

		const { replies, user } = await simulateCommand('!songrequest https://open.spotify.com/track/4PTG3Z6ehGkBF3zI7Y17p3', {
			id: '12345',
			username: 'alice',
			displayName: 'Alice',
			points: 100,
		})

		expect(replies).toHaveLength(1)
		expect(replies[0]).toBe('@Alice, "Blinding Lights by The Weeknd" has been added to the queue (Position #1).')
		expect(user!.points).toBe(90) // 100 - 10

		const dbItems = await db.select().from(spotifyQueue)
		expect(dbItems).toHaveLength(1)
		expect(dbItems[0]!.title).toBe('Blinding Lights')
		expect(dbItems[0]!.status).toBe('pending')
	})

	it('should search for track by query string, add it to queue, deduct points, and reply with success', async () => {
		mockFetch.mockImplementation(async (url: string, opts?: any) => {
			if (url.includes('/v1/search')) {
				const query = opts?.query || {}
				if (query.q === 'rap god' && query.type === 'track') {
					return {
						tracks: {
							items: [
								{
									id: '2x7jGWnCl5crN4VoRj48S4',
									uri: 'spotify:track:2x7jGWnCl5crN4VoRj48S4',
									name: 'Rap God',
									artists: [{ name: 'Eminem' }],
									duration_ms: 363529,
									explicit: true,
									album: { images: [{ url: 'https://art.com/rapgod' }] },
								},
							],
						},
					}
				}
			}
			return { success: true }
		})

		const { replies, user } = await simulateCommand('!songrequest rap god', {
			id: '12345',
			username: 'alice',
			displayName: 'Alice',
			points: 100,
		})

		expect(replies).toHaveLength(1)
		expect(replies[0]).toBe('@Alice, "Rap God by Eminem" has been added to the queue (Position #1).')
		expect(user!.points).toBe(90) // 100 - 10

		const dbItems = await db.select().from(spotifyQueue)
		expect(dbItems).toHaveLength(1)
		expect(dbItems[0]!.title).toBe('Rap God')
		expect(dbItems[0]!.status).toBe('pending')
	})

	it('should allow user to run wrongsong to refund points and remove last request', async () => {
		await db.insert(spotifyQueue).values({
			trackId: 'track-123',
			title: 'Song Title',
			artist: 'Artist Name',
			durationMs: 180000,
			requestedBy: 'Alice',
			pointsCost: 10,
			status: 'pending',
		})

		mockFetch.mockResolvedValue({ success: true })

		const { replies, user } = await simulateCommand('!songrequest wrongsong', {
			id: '12345',
			username: 'alice',
			displayName: 'Alice',
			points: 50,
		})

		expect(replies).toHaveLength(1)
		expect(replies[0]).toBe('@Alice, Removed your last request Song Title from the queue and refunded 10 points.')
		expect(user!.points).toBe(60) // 50 + 10

		const [dbItem] = await db.select().from(spotifyQueue)
		expect(dbItem!.status).toBe('removed')
	})

	it('should allow moderators to remove any item from queue', async () => {
		// Insert user so lookup inside command remove resolves
		await db.insert(spotifyQueue).values({
			trackId: 'track-123',
			title: 'Song Title',
			artist: 'Artist Name',
			durationMs: 180000,
			requestedBy: 'Alice',
			pointsCost: 10,
			status: 'pending',
		})

		mockFetch.mockResolvedValue({ success: true })

		const { replies } = await simulateCommand('!songrequest remove 1', {
			id: 'mod-123',
			username: 'bob',
			displayName: 'Bob',
			role: 'moderator',
		})

		expect(replies).toHaveLength(1)
		expect(replies[0]).toBe('@Bob, Removed Song Title requested by Alice from the queue.')

		const [dbItem] = await db.select().from(spotifyQueue)
		expect(dbItem!.status).toBe('removed')
	})

	it('should output simple confirmation when removing a fallback song', async () => {
		await db.insert(spotifyQueue).values({
			trackId: 'track-123',
			title: 'Song Title',
			artist: 'Artist Name',
			durationMs: 180000,
			requestedBy: 'Fallback Playlist',
			pointsCost: 0,
			status: 'pending',
		})

		mockFetch.mockResolvedValue({ success: true })

		const { replies } = await simulateCommand('!songrequest remove 1', {
			id: 'mod-123',
			username: 'bob',
			displayName: 'Bob',
			role: 'moderator',
		})

		expect(replies).toHaveLength(1)
		expect(replies[0]).toBe('@Bob, Removed autoplay fallback song from the queue.')

		const [dbItem] = await db.select().from(spotifyQueue)
		expect(dbItem!.status).toBe('removed')
	})

	it('should allow moderators to skip current song request', async () => {
		mockFetch.mockResolvedValue({ success: true })

		const { replies } = await simulateCommand('!songrequest skip', {
			id: 'mod-123',
			username: 'bob',
			displayName: 'Bob',
			role: 'moderator',
		})

		expect(replies).toHaveLength(1)
		expect(replies[0]).toBe('@Bob, Skipped current song.')
	})

	it('should allow caster to enable and disable song requests', async () => {
		mockFetch.mockResolvedValue({ success: true })

		const disableRes = await simulateCommand('!songrequest disable', {
			id: 'caster-123',
			username: 'streamer',
			displayName: 'Streamer',
			role: 'caster',
		})
		expect(disableRes.replies[0]).toBe('@Streamer, Spotify song requests have been disabled (queue paused).')

		const enableRes = await simulateCommand('!songrequest enable', {
			id: 'caster-123',
			username: 'streamer',
			displayName: 'Streamer',
			role: 'caster',
		})
		expect(enableRes.replies[0]).toBe('@Streamer, Spotify song requests have been enabled.')
	})

	it('should allow moderator to start playback of the song request playlist', async () => {
		mockFetch.mockResolvedValue({ success: true })

		const { replies } = await simulateCommand('!songrequest play', {
			id: 'mod-123',
			username: 'bob',
			displayName: 'Bob',
			role: 'moderator',
		})

		expect(replies).toHaveLength(1)
		expect(replies[0]).toBe('@Bob, Started playing the song request playlist.')
		expect(mockFetch).toHaveBeenCalledWith(
			'https://api.spotify.com/v1/me/player/play',
			expect.objectContaining({
				method: 'PUT',
				body: expect.objectContaining({
					context_uri: 'spotify:playlist:playlist-123',
				}),
			}),
		)
	})

	it('should allow moderator to like the currently playing song', async () => {
		// Preset target playlist
		await db.insert(settings).values([
			{ key: 'spotify.playlist.target_id', value: 'target-123', updatedAt: new Date() },
		])
		await refreshAppSettingsCache()

		;(globalThis as any).__setMockCurrentlyPlaying__({
			id: 'track-123',
			uri: 'spotify:track:track-123',
			title: 'Song Title',
			artist: 'Artist Name',
			link: 'https://open.spotify.com/track/track-123',
			isPlaying: true,
		})

		mockFetch.mockResolvedValue({ success: true })

		const { replies } = await simulateCommand('!songrequest like', {
			id: 'mod-123',
			username: 'bob',
			displayName: 'Bob',
			role: 'moderator',
		})

		expect(replies).toHaveLength(1)
		expect(replies[0]).toBe('@streamer, the current track requested by @streamer has been saved to the playlist!')
		expect(mockFetch).toHaveBeenCalledWith(
			'https://api.spotify.com/v1/playlists/target-123/items',
			expect.objectContaining({
				method: 'POST',
				body: expect.objectContaining({
					uris: ['spotify:track:track-123'],
				}),
			}),
		)
	})

	it('should reply with already-liked message if the song is already in target playlist cache', async () => {
		// Preset target playlist
		await db.insert(settings).values([
			{ key: 'spotify.playlist.target_id', value: 'target-123', updatedAt: new Date() },
		])
		await refreshAppSettingsCache()

		// Seed target playlist cache table
		await db.insert(spotifyPlaylistCache).values({
			playlistId: 'target-123',
			trackId: 'track-123',
			uri: 'spotify:track:track-123',
			title: 'Song Title',
			artist: 'Artist Name',
			durationMs: 180000,
		})

		;(globalThis as any).__setMockCurrentlyPlaying__({
			id: 'track-123',
			uri: 'spotify:track:track-123',
			title: 'Song Title',
			artist: 'Artist Name',
			link: 'https://open.spotify.com/track/track-123',
			isPlaying: true,
		})

		const { replies } = await simulateCommand('!songrequest like', {
			id: 'mod-123',
			username: 'bob',
			displayName: 'Bob',
			role: 'moderator',
		})

		expect(replies).toHaveLength(1)
		expect(replies[0]).toBe('@Bob, This song is already saved to the stream Spotify playlist!')
		expect(mockFetch).not.toHaveBeenCalled()
	})

	it('should reply with blacklisted error template on blacklisted song request', async () => {
		// Seed blacklist
		await db.insert(spotifyBlacklist).values({
			trackId: '4PTG3Z6ehGkBF3zI7Y17p3',
			title: 'Banned Song',
			artist: 'Banned Artist',
			addedBy: 'streamer',
		})

		const { replies } = await simulateCommand('!songrequest https://open.spotify.com/track/4PTG3Z6ehGkBF3zI7Y17p3', {
			id: '12345',
			username: 'alice',
			displayName: 'Alice',
			points: 100,
		})

		expect(replies).toHaveLength(1)
		expect(replies[0]).toBe('@Alice, This track is blacklisted and cannot be requested.')
	})

	it('should allow moderator to blacklist a track using !songrequest blacklist <link>', async () => {
		mockFetch.mockResolvedValue({
			id: 'tracktoban123456789012',
			uri: 'spotify:track:tracktoban123456789012',
			name: 'Banned Song Title',
			artists: [{ name: 'Artist Name' }],
			duration_ms: 180000,
			album: { images: [] },
		})

		const { replies } = await simulateCommand('!songrequest blacklist https://open.spotify.com/track/tracktoban123456789012', {
			id: 'mod-123',
			username: 'bob',
			displayName: 'Bob',
			role: 'moderator',
		})

		expect(replies).toHaveLength(1)
		expect(replies[0]).toBe('@Bob, Track "Banned Song Title" has been added to the blacklist.')

		const dbItems = await db.select().from(spotifyBlacklist).where(eq(spotifyBlacklist.trackId, 'tracktoban123456789012'))
		expect(dbItems).toHaveLength(1)
		expect(dbItems[0]!.title).toBe('Banned Song Title')
		expect(dbItems[0]!.addedBy).toBe('Bob')
	})

	it('should reply with user limit reached error if viewer exceeds max active user requests limit', async () => {
		// Preset user request limit = 1
		await db.insert(settings).values([
			{ key: 'spotify.sr.max_user_requests', value: '1', updatedAt: new Date() },
		])
		await refreshAppSettingsCache()

		// Seed Alice's existing pending request
		await db.insert(spotifyQueue).values({
			trackId: 'existingtrack123456789',
			title: 'Song Title',
			artist: 'Artist Name',
			durationMs: 180000,
			requestedBy: 'Alice',
			pointsCost: 10,
			status: 'pending',
		})

		const { replies } = await simulateCommand('!songrequest https://open.spotify.com/track/4PTG3Z6ehGkBF3zI7Y17p3', {
			id: '12345',
			username: 'alice',
			displayName: 'Alice',
			points: 100,
		})

		expect(replies).toHaveLength(1)
		expect(replies[0]).toBe('@Alice, You have reached your limit of active song requests (1 songs).')
	})

	describe('Spotify Queue Engine Tick and Alerts', () => {
		beforeEach(async () => {
			await clearDatabase()
			await db.insert(spotifyTokens).values({
				id: 'streamer',
				accessToken: 'access-123',
				refreshToken: 'refresh-123',
				expiresIn: 3600,
				obtainmentTimestamp: Date.now(),
				scope: 'user-read-currently-playing playlist-modify-public playlist-modify-private',
			})
			await db.insert(twitchTokens).values({
				accountType: 'streamer',
				userId: 'streamer-id-123',
				userName: 'streamer',
				displayName: 'Streamer',
				accessToken: 'twitch-access-token',
				refreshToken: 'twitch-refresh-token',
				obtainmentTimestamp: Date.now(),
				scope: 'chat:read chat:edit',
			})
			;(globalThis as any).__setMockSpotifyToken__({ id: 'streamer', accessToken: 'access-123', refreshToken: 'refresh-123' })
			;(globalThis as any).__setMockCurrentlyPlaying__(null)
		})

		it('should NOT advance the queue if contextUri does not match request playlist (Context Guard)', async () => {
			await db.insert(settings).values([
				{ key: 'spotify.sr.enabled', value: 'true', updatedAt: new Date() },
				{ key: 'spotify.request.playlist_id', value: 'playlist-123', updatedAt: new Date() },
			])
			await refreshAppSettingsCache()

			await db.insert(spotifyQueue).values({
				trackId: 'track-abc',
				title: 'Active Song',
				artist: 'Artist',
				durationMs: 180000,
				requestedBy: 'Alice',
				pointsCost: 10,
				status: 'pending',
			})

			;(globalThis as any).__setMockCurrentlyPlaying__({
				id: 'track-abc',
				uri: 'spotify:track:track-abc',
				title: 'Active Song',
				artist: 'Artist',
				link: 'https://open.spotify.com/track/track-abc',
				isPlaying: true,
				contextUri: 'spotify:playlist:different-playlist-id',
			})

			mockFetch.mockResolvedValue({ success: true })

			const { triggerQueueEngineTick } = await import('~~/server/bot/modules/spotify/queue-engine')
			await triggerQueueEngineTick()

			const [dbItem] = await db.select().from(spotifyQueue).where(eq(spotifyQueue.trackId, 'track-abc'))
			expect(dbItem!.status).toBe('pending')
		})

		it('should trigger low queue and empty queue alerts on downward transitions when enabled', async () => {
			const { mockSay } = await import('../setup')
			const { triggerQueueEngineTick } = await import('~~/server/bot/modules/spotify/queue-engine')

			await db.insert(settings).values([
				{ key: 'spotify.sr.enabled', value: 'true', updatedAt: new Date() },
				{ key: 'spotify.request.playlist_id', value: 'playlist-123', updatedAt: new Date() },
				{ key: 'spotify.sr.alert_queue_low_enabled', value: 'true', updatedAt: new Date() },
				{ key: 'spotify.sr.alert_queue_empty_enabled', value: 'true', updatedAt: new Date() },
			])
			await refreshAppSettingsCache()

			const tracksToInsert = Array.from({ length: 6 }).map((_, i) => ({
				trackId: `track-${i}`,
				title: `Song ${i}`,
				artist: 'Artist',
				durationMs: 180000,
				requestedBy: 'Alice',
				pointsCost: 10,
				status: 'pending' as const,
			}))
			await db.insert(spotifyQueue).values(tracksToInsert)

			;(globalThis as any).__setMockCurrentlyPlaying__({
				id: 'track-0',
				uri: 'spotify:track:track-0',
				title: 'Song 0',
				artist: 'Artist',
				link: 'https://open.spotify.com/track/track-0',
				isPlaying: true,
				contextUri: 'spotify:playlist:playlist-123',
			})
			mockFetch.mockResolvedValue({ success: true })
			await triggerQueueEngineTick()

			const dbItem = await db.select().from(spotifyQueue).where(eq(spotifyQueue.trackId, 'track-0')).then(r => r[0])
			expect(dbItem!.status).toBe('playing')
			expect(mockSay).not.toHaveBeenCalled()

			;(globalThis as any).__setMockCurrentlyPlaying__({
				id: 'track-1',
				uri: 'spotify:track:track-1',
				title: 'Song 1',
				artist: 'Artist',
				link: 'https://open.spotify.com/track/track-1',
				isPlaying: true,
				contextUri: 'spotify:playlist:playlist-123',
			})
			await triggerQueueEngineTick()

			const dbTrack0 = await db.select().from(spotifyQueue).where(eq(spotifyQueue.trackId, 'track-0')).then(r => r[0])
			const dbTrack1 = await db.select().from(spotifyQueue).where(eq(spotifyQueue.trackId, 'track-1')).then(r => r[0])
			expect(dbTrack0!.status).toBe('played')
			expect(dbTrack1!.status).toBe('playing')

			expect(mockSay).toHaveBeenCalledWith(expect.any(String), 'The song request queue is running low (5 songs remaining).')
			mockSay.mockClear()

			await db.update(spotifyQueue).set({ status: 'played' }).where(
				and(
					eq(spotifyQueue.status, 'pending'),
					sql`${spotifyQueue.trackId} != 'track-5'`,
				),
			)

			;(globalThis as any).__setMockCurrentlyPlaying__({
				id: 'track-5',
				uri: 'spotify:track:track-5',
				title: 'Song 5',
				artist: 'Artist',
				link: 'https://open.spotify.com/track/track-5',
				isPlaying: true,
				contextUri: 'spotify:playlist:playlist-123',
				progressMs: 170000,
			})
			await triggerQueueEngineTick()

			let dbTrack5 = await db.select().from(spotifyQueue).where(eq(spotifyQueue.trackId, 'track-5')).then(r => r[0])
			expect(dbTrack5!.status).toBe('playing')

			;(globalThis as any).__setMockCurrentlyPlaying__({
				id: 'autoplay-track',
				uri: 'spotify:track:autoplay-track',
				title: 'Autoplay Track',
				artist: 'Artist',
				link: 'https://open.spotify.com/track/autoplay-track',
				isPlaying: true,
				contextUri: 'spotify:playlist:autoplay-playlist',
			})

			await triggerQueueEngineTick()

			dbTrack5 = await db.select().from(spotifyQueue).where(eq(spotifyQueue.trackId, 'track-5')).then(r => r[0])
			expect(dbTrack5!.status).toBe('played')

			expect(mockSay).toHaveBeenCalledWith(expect.any(String), 'The song request queue has finished! There are no autoplay songs configured.')
		})

		it('should NOT transition playing track to played if context switches before completion threshold (skipped early)', async () => {
			const { triggerQueueEngineTick } = await import('~~/server/bot/modules/spotify/queue-engine')

			await db.insert(settings).values([
				{ key: 'spotify.sr.enabled', value: 'true', updatedAt: new Date() },
				{ key: 'spotify.request.playlist_id', value: 'playlist-123', updatedAt: new Date() },
			])
			await refreshAppSettingsCache()

			await db.insert(spotifyQueue).values({
				trackId: 'track-abc',
				title: 'Active Song',
				artist: 'Artist',
				durationMs: 180000,
				requestedBy: 'Alice',
				pointsCost: 10,
				status: 'pending',
			})

			;(globalThis as any).__setMockCurrentlyPlaying__({
				id: 'track-abc',
				uri: 'spotify:track:track-abc',
				title: 'Active Song',
				artist: 'Artist',
				link: 'https://open.spotify.com/track/track-abc',
				isPlaying: true,
				contextUri: 'spotify:playlist:playlist-123',
			})
			mockFetch.mockResolvedValue({ success: true })
			await triggerQueueEngineTick()

			let dbItem = await db.select().from(spotifyQueue).where(eq(spotifyQueue.trackId, 'track-abc')).then(r => r[0])
			expect(dbItem!.status).toBe('playing')

			;(globalThis as any).__setMockCurrentlyPlaying__({
				id: 'other-track',
				uri: 'spotify:track:other-track',
				title: 'Other Song',
				artist: 'Artist',
				link: 'https://open.spotify.com/track/other-track',
				isPlaying: true,
				contextUri: 'spotify:playlist:other-playlist',
			})
			await triggerQueueEngineTick()

			dbItem = await db.select().from(spotifyQueue).where(eq(spotifyQueue.trackId, 'track-abc')).then(r => r[0])
			expect(dbItem!.status).toBe('playing')
		})
	})
})
