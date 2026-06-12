import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import blacklistDeleteHandler from '~~/server/api/spotify/blacklist/[id].delete'
import blacklistGetHandler from '~~/server/api/spotify/blacklist/index.get'
import blacklistPostHandler from '~~/server/api/spotify/blacklist/index.post'
import likePostHandler from '~~/server/api/spotify/like.post'
import playlistInitHandler from '~~/server/api/spotify/playlist-init.post'
import queueItemDeleteHandler from '~~/server/api/spotify/queue/[id].delete'
import queueDeleteHandler from '~~/server/api/spotify/queue/index.delete'
import queueGetHandler from '~~/server/api/spotify/queue/index.get'
import queuePostHandler from '~~/server/api/spotify/queue/index.post'
import settingsGetHandler from '~~/server/api/spotify/settings.get'
import settingsPutHandler from '~~/server/api/spotify/settings.put'
import { db } from '~~/server/database'
import { settings, spotifyBlacklist, spotifyPlaylistCache, spotifyQueue, spotifyTokens, users } from '~~/server/database/schema'
import { refreshAppSettingsCache } from '~~/server/utils/settings'
import { clearDatabase, createTestUser } from '../helpers'
import { mockGetStreamInfo } from '../setup'

// Mocking Spotify global client fetch requests
const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

describe('Spotify Queue & Playlists API Endpoints', () => {
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
		;(globalThis as any).getUserSession.mockResolvedValue({
			user: { id: 'mock-user-id', username: 'streamerchannel', role: 'caster', displayName: 'StreamerChannel' },
		})
		await refreshAppSettingsCache()
	})

	describe('Settings Endpoints', () => {
		it('should retrieve song request settings', async () => {
			const res = await settingsGetHandler({} as any)
			expect(res).toBeDefined()
			expect(res.active).toBe(true)
			expect(res.pointsCost).toBe(10)
		})

		it('should update song request settings', async () => {
			const mockEvent = {
				body: {
					active: false,
					pointsCost: 50,
					maxLength: 5,
					maxQueue: 20,
					maxUserRequests: 5,
					modsBypassLimits: false,
					followersOnly: true,
					permitExplicit: false,
					offlineOverride: true,
					targetPlaylist: 'my-likes',
					targetPlaylistName: 'My Likes',
					allowModerators: false,
					whisperNotifications: true,
				},
			} as any
			const res = await settingsPutHandler(mockEvent)
			expect(res).toEqual({ success: true })

			const updated = await settingsGetHandler({} as any)
			expect(updated.active).toBe(false)
			expect(updated.pointsCost).toBe(50)
			expect(updated.maxLength).toBe(5)
			expect(updated.maxQueue).toBe(20)
			expect(updated.maxUserRequests).toBe(5)
			expect(updated.modsBypassLimits).toBe(false)
			expect(updated.followersOnly).toBe(true)
			expect(updated.permitExplicit).toBe(false)
			expect(updated.offlineOverride).toBe(true)
			expect(updated.targetPlaylist).toBe('my-likes')
			expect(updated.targetPlaylistName).toBe('My Likes')
			expect(updated.allowModerators).toBe(false)
			expect(updated.whisperNotifications).toBe(true)
		})
	})

	describe('Playlist Init Endpoints', () => {
		it('should initialize dedicated song request playlist', async () => {
			mockFetch.mockImplementation(async (url: string, _opts: any) => {
				if (url.includes('/me')) {
					return { id: 'spotify-user-123' }
				}
				if (url.includes('/playlists')) {
					return { id: 'new-playlist-789' }
				}
				return {}
			})

			const res = await playlistInitHandler({} as any)
			expect(res.success).toBe(true)
			expect(res.playlistId).toBe('new-playlist-789')

			const settingsRes = await settingsGetHandler({} as any)
			expect(settingsRes.playlistId).toBe('new-playlist-789')
		})
	})

	describe('Song Requests Queue Endpoints', () => {
		beforeEach(async () => {
			// Preset settings
			await db.insert(settings).values([
				{ key: 'spotify.sr.enabled', value: 'true', updatedAt: new Date() },
				{ key: 'spotify.sr.points_cost', value: '100', updatedAt: new Date() },
				{ key: 'spotify.request.playlist_id', value: 'playlist-123', updatedAt: new Date() },
				{ key: 'spotify.playlist.target_id', value: 'target-123', updatedAt: new Date() },
			])
			await refreshAppSettingsCache()
		})

		it('should block song requests if user does not have enough points', async () => {
			// Logged in as viewer with 50 points
			;(globalThis as any).getUserSession.mockResolvedValue({
				user: { id: 'viewer-id', username: 'alice', role: 'viewer', displayName: 'Alice' },
			})
			await createTestUser({ id: 'viewer-id', username: 'alice', points: 50 })

			const mockEvent = {
				body: { link: 'https://open.spotify.com/track/4PTG3Z6ehGkBF3zI7Y17p3' },
			} as any

			await expect(queuePostHandler(mockEvent)).rejects.toThrow('You do not have enough points')
		})

		it('should reject song requests if viewer exceeds max active user requests limit', async () => {
			// Preset settings with user request limit = 1
			await db.insert(settings).values([
				{ key: 'spotify.sr.max_user_requests', value: '1', updatedAt: new Date() },
			])
			await refreshAppSettingsCache()

			// Logged in as viewer with 500 points
			;(globalThis as any).getUserSession.mockResolvedValue({
				user: { id: 'viewer-id', username: 'alice', role: 'viewer', displayName: 'Alice' },
			})
			await createTestUser({ id: 'viewer-id', username: 'alice', points: 500 })

			// Seed one pending request for Alice
			await db.insert(spotifyQueue).values({
				trackId: '1234567890123456789012',
				title: 'Existing Song',
				artist: 'Existing Artist',
				durationMs: 180000,
				requestedBy: 'Alice',
				pointsCost: 100,
				status: 'pending',
			})

			const mockEvent = {
				body: { link: 'https://open.spotify.com/track/4PTG3Z6ehGkBF3zI7Y17p3' },
			} as any

			await expect(queuePostHandler(mockEvent)).rejects.toThrow('You have reached your limit of active song requests')
		})

		it('should bypass max song length limit if modsBypassLimits is true and user is caster', async () => {
			// Preset settings: max_length = 2 minutes (120000ms), but track is 200000ms
			await db.insert(settings).values([
				{ key: 'spotify.sr.max_length', value: '2', updatedAt: new Date() },
				{ key: 'spotify.sr.mods_bypass_limits', value: 'true', updatedAt: new Date() },
			])
			await refreshAppSettingsCache()

			// Logged in as caster
			;(globalThis as any).getUserSession.mockResolvedValue({
				user: { id: 'caster-id', username: 'streamer', role: 'caster', displayName: 'Streamer' },
			})
			await createTestUser({ id: 'caster-id', username: 'streamer', points: 500 })

			mockFetch.mockImplementation(async (url: string, _opts: any) => {
				if (url.includes('/tracks/4PTG3Z6ehGkBF3zI7Y17p3')) {
					return {
						id: '4PTG3Z6ehGkBF3zI7Y17p3',
						uri: 'spotify:track:4PTG3Z6ehGkBF3zI7Y17p3',
						name: 'Blinding Lights',
						artists: [{ name: 'The Weeknd' }],
						duration_ms: 200000, // 200 seconds (> 120 seconds limit)
						explicit: false,
						album: { images: [{ url: 'https://art.com/blinding' }] },
					}
				}
				if (url.includes('/playlists/playlist-123/tracks')) {
					return { snapshot_id: 'snapshot-1' }
				}
				return {}
			})

			const mockEvent = {
				body: { link: 'https://open.spotify.com/track/4PTG3Z6ehGkBF3zI7Y17p3' },
			} as any

			const res = await queuePostHandler(mockEvent)
			expect(res.success).toBe(true)
			expect(res.track.title).toBe('Blinding Lights')
		})

		it('should accept song request, deduct points, and push to database and playlist', async () => {
			// Mock Spotify track details lookup and playlist add
			mockFetch.mockImplementation(async (url: string, _opts: any) => {
				if (url.includes('/tracks/4PTG3Z6ehGkBF3zI7Y17p3')) {
					return {
						id: '4PTG3Z6ehGkBF3zI7Y17p3',
						uri: 'spotify:track:4PTG3Z6ehGkBF3zI7Y17p3',
						name: 'Blinding Lights',
						artists: [{ name: 'The Weeknd' }],
						duration_ms: 200000,
						explicit: false,
						album: { images: [{ url: 'https://art.com/blinding' }] },
					}
				}
				if (url.includes('/playlists/playlist-123/tracks')) {
					return { snapshot_id: 'snapshot-1' }
				}
				return {}
			})

			// Logged in as viewer with 500 points
			;(globalThis as any).getUserSession.mockResolvedValue({
				user: { id: 'viewer-id', username: 'alice', role: 'viewer', displayName: 'Alice' },
			})
			await createTestUser({ id: 'viewer-id', username: 'alice', points: 500 })

			const mockEvent = {
				body: { link: 'https://open.spotify.com/track/4PTG3Z6ehGkBF3zI7Y17p3' },
			} as any

			const res = await queuePostHandler(mockEvent)
			expect(res.success).toBe(true)
			expect(res.track.title).toBe('Blinding Lights')

			// Verify points deduction
			const [dbUser] = await db.select().from(users).where(eq(users.id, 'viewer-id'))
			expect(dbUser!.points).toBe(400) // 500 - 100

			// Verify DB queue item
			const items = await db.select().from(spotifyQueue)
			expect(items).toHaveLength(1)
			expect(items[0]!.title).toBe('Blinding Lights')
			expect(items[0]!.requestedBy).toBe('Alice')
			expect(items[0]!.status).toBe('pending')
		})

		it('should allow Caster to clear queue and refund points', async () => {
			// Seed active queue
			await createTestUser({ id: 'viewer-id', username: 'alice', points: 0 })
			await db.insert(spotifyQueue).values({
				trackId: 'track-abc',
				title: 'Song A',
				artist: 'Artist A',
				durationMs: 180000,
				requestedBy: 'Alice',
				pointsCost: 100,
				status: 'pending',
			})

			mockFetch.mockResolvedValue({ success: true })

			const res = await queueDeleteHandler({} as any)
			expect(res.success).toBe(true)

			// Check refund
			const [dbUser] = await db.select().from(users).where(eq(users.id, 'viewer-id'))
			expect(dbUser!.points).toBe(100) // refunded

			// Check DB status
			const [item] = await db.select().from(spotifyQueue)
			expect(item!.status).toBe('removed')
		})

		it('should clear viewer queue items but preserve autoplay fallback tracks', async () => {
			await createTestUser({ id: 'viewer-id', username: 'alice', points: 0 })
			await db.insert(spotifyQueue).values([
				{
					trackId: 'track-abc',
					title: 'Song A',
					artist: 'Artist A',
					durationMs: 180000,
					requestedBy: 'Alice',
					pointsCost: 100,
					status: 'pending',
				},
				{
					trackId: 'track-fallback',
					title: 'Fallback Song',
					artist: 'Fallback Artist',
					durationMs: 180000,
					requestedBy: 'Fallback Playlist',
					pointsCost: 0,
					status: 'pending',
				},
			])

			mockFetch.mockResolvedValue({ success: true })

			const res = await queueDeleteHandler({} as any)
			expect(res.success).toBe(true)

			// Alice should be refunded
			const [dbUser] = await db.select().from(users).where(eq(users.id, 'viewer-id'))
			expect(dbUser!.points).toBe(100)

			// Alice's track should be removed, but Fallback Song should remain pending
			const items = await db.select().from(spotifyQueue)
			const aliceItem = items.find(i => i.requestedBy === 'Alice')
			const fallbackItem = items.find(i => i.requestedBy === 'Fallback Playlist')

			expect(aliceItem!.status).toBe('removed')
			expect(fallbackItem!.status).toBe('pending')
		})

		it('should allow Mods to delete a specific item and refund points', async () => {
			await createTestUser({ id: 'viewer-id', username: 'alice', points: 50 })
			const [seeded] = await db.insert(spotifyQueue).values({
				trackId: 'track-abc',
				title: 'Song A',
				artist: 'Artist A',
				durationMs: 180000,
				requestedBy: 'Alice',
				pointsCost: 100,
				status: 'pending',
			}).returning()

			;(globalThis as any).getUserSession.mockResolvedValue({
				user: { id: 'mod-id', username: 'bob', role: 'moderator', displayName: 'Bob' },
			})

			mockFetch.mockResolvedValue({ success: true })

			const res = await queueItemDeleteHandler({
				context: { params: { id: String(seeded!.id) } },
			} as any)
			expect(res.success).toBe(true)

			const [dbUser] = await db.select().from(users).where(eq(users.id, 'viewer-id'))
			expect(dbUser!.points).toBe(150) // 50 + 100 refund

			const [item] = await db.select().from(spotifyQueue)
			expect(item!.status).toBe('removed')
		})

		it('should allow a viewer to delete their own pending request and get a refund', async () => {
			await createTestUser({ id: 'viewer-id', username: 'alice', points: 50 })
			const [seeded] = await db.insert(spotifyQueue).values({
				trackId: 'track-abc',
				title: 'Song A',
				artist: 'Artist A',
				durationMs: 180000,
				requestedBy: 'Alice',
				pointsCost: 100,
				status: 'pending',
			}).returning()

			;(globalThis as any).getUserSession.mockResolvedValue({
				user: { id: 'viewer-id', username: 'alice', role: 'viewer', displayName: 'Alice' },
			})

			mockFetch.mockResolvedValue({ success: true })

			const res = await queueItemDeleteHandler({
				context: { params: { id: String(seeded!.id) } },
			} as any)
			expect(res.success).toBe(true)

			const [dbUser] = await db.select().from(users).where(eq(users.id, 'viewer-id'))
			expect(dbUser!.points).toBe(150) // refunded

			const [item] = await db.select().from(spotifyQueue)
			expect(item!.status).toBe('removed')
		})

		it('should block a viewer from deleting another viewer request', async () => {
			await createTestUser({ id: 'viewer-id', username: 'alice', points: 50 })
			const [seeded] = await db.insert(spotifyQueue).values({
				trackId: 'track-abc',
				title: 'Song A',
				artist: 'Artist A',
				durationMs: 180000,
				requestedBy: 'Alice',
				pointsCost: 100,
				status: 'pending',
			}).returning()

			;(globalThis as any).getUserSession.mockResolvedValue({
				user: { id: 'other-viewer-id', username: 'charlie', role: 'viewer', displayName: 'Charlie' },
			})

			mockFetch.mockResolvedValue({ success: true })

			await expect(
				queueItemDeleteHandler({
					context: { params: { id: String(seeded!.id) } },
				} as any),
			).rejects.toThrow('You do not have permission to remove this item.')
		})
	})

	describe('Like Song Endpoint', () => {
		it('should like the currently playing song and save it to target playlist', async () => {
			// Preset settings
			await db.insert(settings).values([
				{ key: 'spotify.playlist.target_id', value: 'target-123', updatedAt: new Date() },
			])
			await refreshAppSettingsCache()

			// Set currently playing
			;(globalThis as any).__setMockCurrentlyPlaying__({
				id: 'track-123',
				uri: 'spotify:track:track-123',
				title: 'Test Song',
				artist: 'Test Artist',
				link: 'https://open.spotify.com/track/track-123',
				isPlaying: true,
			})

			mockFetch.mockResolvedValue({ success: true })

			const res = await likePostHandler({} as any)
			expect(res).toEqual({ success: true, alreadyLiked: false, title: 'Test Song' })
			expect(mockFetch).toHaveBeenCalledWith(
				'https://api.spotify.com/v1/playlists/target-123/tracks',
				expect.objectContaining({
					method: 'POST',
					body: expect.objectContaining({
						uris: ['spotify:track:track-123'],
					}),
				}),
			)
		})

		it('should return alreadyLiked: true if song is already in target playlist cache', async () => {
			// Preset settings
			await db.insert(settings).values([
				{ key: 'spotify.playlist.target_id', value: 'target-123', updatedAt: new Date() },
			])
			await refreshAppSettingsCache()

			// Seed target playlist cache table
			await db.insert(spotifyPlaylistCache).values({
				playlistId: 'target-123',
				trackId: 'track-123',
				uri: 'spotify:track:track-123',
				title: 'Test Song',
				artist: 'Test Artist',
				durationMs: 180000,
			})

			// Set currently playing
			;(globalThis as any).__setMockCurrentlyPlaying__({
				id: 'track-123',
				uri: 'spotify:track:track-123',
				title: 'Test Song',
				artist: 'Test Artist',
				link: 'https://open.spotify.com/track/track-123',
				isPlaying: true,
			})

			const res = await likePostHandler({} as any)
			expect(res).toEqual({ success: true, alreadyLiked: true, title: 'Test Song' })
			// mockFetch should NOT have been called to add tracks
			expect(mockFetch).not.toHaveBeenCalled()
		})

		it('should include isLiked on currentlyPlaying in queue status request', async () => {
			// Seed settings and cache
			await db.insert(settings).values([
				{ key: 'spotify.playlist.target_id', value: 'target-123', updatedAt: new Date() },
			])
			await db.insert(spotifyPlaylistCache).values({
				playlistId: 'target-123',
				trackId: 'track-123',
				uri: 'spotify:track:track-123',
				title: 'Test Song',
				artist: 'Test Artist',
				durationMs: 180000,
			})
			await refreshAppSettingsCache()

			// Set currently playing
			;(globalThis as any).__setMockCurrentlyPlaying__({
				id: 'track-123',
				uri: 'spotify:track:track-123',
				title: 'Test Song',
				artist: 'Test Artist',
				link: 'https://open.spotify.com/track/track-123',
				isPlaying: true,
			})

			const res = await queueGetHandler({} as any)
			expect(res.currentlyPlaying).toBeDefined()
			expect(res.currentlyPlaying!.isLiked).toBe(true)
		})

		it('should reject requests from non-admin/moderator users', async () => {
			;(globalThis as any).getUserSession.mockResolvedValue({
				user: { id: 'viewer-id', username: 'alice', role: 'viewer', displayName: 'Alice' },
			})

			await expect(likePostHandler({} as any)).rejects.toThrow('Forbidden')
		})

		it('should reject if target playlist is not configured', async () => {
			await expect(likePostHandler({} as any)).rejects.toThrow('No target playlist configured')
		})

		it('should reject if no song is currently playing', async () => {
			await db.insert(settings).values([
				{ key: 'spotify.playlist.target_id', value: 'target-123', updatedAt: new Date() },
			])
			await refreshAppSettingsCache()

			;(globalThis as any).__setMockCurrentlyPlaying__(null)

			await expect(likePostHandler({} as any)).rejects.toThrow('No song is currently playing')
		})
	})

	describe('Blacklist Endpoints', () => {
		beforeEach(async () => {
			await db.insert(settings).values([
				{ key: 'spotify.sr.enabled', value: 'true', updatedAt: new Date() },
				{ key: 'spotify.request.playlist_id', value: 'playlist-123', updatedAt: new Date() },
				{ key: 'spotify.sr.points_cost', value: '100', updatedAt: new Date() },
			])
			await refreshAppSettingsCache()
		})

		it('should reject non-moderators from managing blacklist', async () => {
			;(globalThis as any).getUserSession.mockResolvedValue({
				user: { id: 'viewer-id', username: 'alice', role: 'viewer', displayName: 'Alice' },
			})

			await expect(blacklistGetHandler({} as any)).rejects.toThrow('Forbidden')
			await expect(blacklistPostHandler({} as any)).rejects.toThrow('Forbidden')
			await expect(blacklistDeleteHandler({} as any)).rejects.toThrow('Forbidden')
		})

		it('should allow moderator to add, fetch, and delete blacklist items', async () => {
			// Mock track details endpoint
			mockFetch.mockResolvedValue({
				id: '4567890123456789012345',
				uri: 'spotify:track:4567890123456789012345',
				name: 'Blacklisted Track',
				artists: [{ name: 'Heavy Metal Artist' }],
				duration_ms: 200000,
				album: { images: [{ url: 'https://art.com/metal' }] },
			})

			// 1. Add to blacklist
			const postRes = await blacklistPostHandler({
				body: { link: 'https://open.spotify.com/track/4567890123456789012345' },
			} as any)
			expect(postRes.success).toBe(true)
			expect(postRes.track!.title).toBe('Blacklisted Track')

			// 2. Fetch list
			const getRes = await blacklistGetHandler({} as any)
			expect(getRes.data).toHaveLength(1)
			expect(getRes.data[0]!.title).toBe('Blacklisted Track')
			expect(getRes.meta.total).toBe(1)

			// 3. Delete blacklist item
			const deleteRes = await blacklistDeleteHandler({
				context: { params: { id: String(postRes.track!.id) } },
			} as any)
			expect(deleteRes.success).toBe(true)

			// 4. Verify list is empty
			const finalGetRes = await blacklistGetHandler({} as any)
			expect(finalGetRes.data).toHaveLength(0)
		})

		it('should reject queue requests for blacklisted tracks', async () => {
			// Seed blacklist
			await db.insert(spotifyBlacklist).values({
				trackId: 'trackblacklisted123456',
				title: 'Banned Song',
				artist: 'Banned Artist',
				addedBy: 'streamer',
			})

			;(globalThis as any).getUserSession.mockResolvedValue({
				user: { id: 'viewer-id', username: 'alice', role: 'viewer', displayName: 'Alice' },
			})
			await createTestUser({ id: 'viewer-id', username: 'alice', points: 200 })

			const mockEvent = {
				body: { link: 'https://open.spotify.com/track/trackblacklisted123456' },
			} as any

			await expect(queuePostHandler(mockEvent)).rejects.toThrow('This track is blacklisted on this channel.')
		})

		it('should remove pending requests and refund points when track is blacklisted', async () => {
			// Seed a pending request for a user
			await createTestUser({ id: 'viewer-id', username: 'alice', points: 50 })
			const [pendingItem] = await db.insert(spotifyQueue).values({
				trackId: 'trackbannedsoon1234567',
				title: 'Banned Soon',
				artist: 'Some Artist',
				durationMs: 180000,
				requestedBy: 'Alice',
				pointsCost: 100,
				status: 'pending',
			}).returning()

			mockFetch.mockResolvedValue({
				id: 'trackbannedsoon1234567',
				uri: 'spotify:track:trackbannedsoon1234567',
				name: 'Banned Soon',
				artists: [{ name: 'Some Artist' }],
				duration_ms: 180000,
				album: { images: [] },
			})

			// Blacklist the song
			const postRes = await blacklistPostHandler({
				body: { link: 'https://open.spotify.com/track/trackbannedsoon1234567' },
			} as any)
			expect(postRes.success).toBe(true)

			// Check point refund
			const [dbUser] = await db.select().from(users).where(eq(users.id, 'viewer-id'))
			expect(dbUser!.points).toBe(150) // 50 + 100 refund

			// Check queue item removed status
			const [dbItem] = await db.select().from(spotifyQueue).where(eq(spotifyQueue.id, pendingItem!.id))
			expect(dbItem!.status).toBe('removed')
		})
	})
})
