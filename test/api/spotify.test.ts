import { beforeEach, describe, expect, it, vi } from 'vitest'
import spotifyDisconnectHandler from '~~/server/api/spotify/disconnect.post'
import spotifyStatusHandler from '~~/server/api/spotify/status.get'
import { db } from '~~/server/database'
import { spotifyTokens } from '~~/server/database/schema'
import { clearDatabase } from '../helpers'

describe('Spotify API Endpoints', () => {
	beforeEach(async () => {
		await clearDatabase()
		vi.clearAllMocks()
		;(globalThis as any).__setMockSpotifyToken__(undefined)
		;(globalThis as any).__setMockCurrentlyPlaying__(undefined)
		;(globalThis as any).__setMockSpotifyUserProfile__(undefined)
	})

	describe('GET /api/spotify/status', () => {
		it('should return connected: false if no token in DB', async () => {
			const res = await spotifyStatusHandler({} as any)
			expect(res).toEqual({
				connected: false,
				currentlyPlaying: null,
				profile: null,
				rateLimited: false,
				retryAfter: 0,
			})
		})

		it('should return connected: true and currentlyPlaying if token exists', async () => {
			await db.insert(spotifyTokens).values({
				id: 'streamer',
				accessToken: 'access-123',
				refreshToken: 'refresh-123',
				obtainmentTimestamp: Date.now(),
				expiresIn: 3600,
				scope: 'user-read-currently-playing',
			})

			const mockTrack = {
				title: 'After Hours',
				artist: 'The Weeknd',
				link: 'https://open.spotify.com/track/AfterHours',
				isPlaying: true,
				albumName: 'After Hours',
				albumArt: 'https://i.scdn.co/image/ab67616d0000b2738863bc310707e1fd1f87aa9f',
				progressMs: 30000,
				durationMs: 361000,
			}
			const mockProfile = {
				displayName: 'Spotify User',
				username: 'spotify-user-123',
			}
			;(globalThis as any).__setMockCurrentlyPlaying__(mockTrack)
			;(globalThis as any).__setMockSpotifyUserProfile__(mockProfile)

			const res = await spotifyStatusHandler({} as any)
			expect(res).toEqual({
				connected: true,
				currentlyPlaying: mockTrack,
				profile: mockProfile,
				rateLimited: false,
				retryAfter: 0,
			})
		})
	})

	describe('POST /api/spotify/disconnect', () => {
		it('should delete token from DB', async () => {
			await db.insert(spotifyTokens).values({
				id: 'streamer',
				accessToken: 'access-123',
				refreshToken: 'refresh-123',
				obtainmentTimestamp: Date.now(),
				expiresIn: 3600,
				scope: 'user-read-currently-playing',
			})

			const res = await spotifyDisconnectHandler({} as any)
			expect(res).toEqual({ status: 'ok' })

			const dbTokens = await db.select().from(spotifyTokens)
			expect(dbTokens).toHaveLength(0)
		})
	})
})
