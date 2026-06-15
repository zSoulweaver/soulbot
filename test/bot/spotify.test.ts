import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearDatabase, simulateCommand } from '../helpers'

describe('Bot Spotify Commands Integration', () => {
	beforeEach(async () => {
		await clearDatabase()
		vi.clearAllMocks()
		;(globalThis as any).__setMockSpotifyToken__(undefined)
		;(globalThis as any).__setMockCurrentlyPlaying__(undefined)
	})

	it('should reply that Spotify is not connected if there is no token in DB', async () => {
		// Mock token to be null
		;(globalThis as any).__setMockSpotifyToken__(null)

		const { replies } = await simulateCommand('!song', {
			id: '12345',
			username: 'alice',
			displayName: 'Alice',
		})

		expect(replies).toHaveLength(1)
		expect(replies[0]).toBe('@Alice, Spotify is not connected. The broadcaster needs to connect their Spotify account on the admin panel.')
	})

	it('should reply that no song is playing if currently playing returns null', async () => {
		// Mock token and currently playing state
		;(globalThis as any).__setMockSpotifyToken__({ id: 'streamer' })
		;(globalThis as any).__setMockCurrentlyPlaying__(null)

		const { replies } = await simulateCommand('!song', {
			id: '12345',
			username: 'alice',
			displayName: 'Alice',
		})

		expect(replies).toHaveLength(1)
		expect(replies[0]).toBe('@Alice, No song is currently playing on Spotify.')
	})

	it('should reply with currently playing track details if a track is active', async () => {
		// Mock token and currently playing state
		;(globalThis as any).__setMockSpotifyToken__({ id: 'streamer' })
		;(globalThis as any).__setMockCurrentlyPlaying__({
			title: 'After Hours',
			artist: 'The Weeknd',
			link: 'https://open.spotify.com/track/AfterHours',
			isPlaying: true,
			albumName: 'After Hours',
			albumArt: 'https://i.scdn.co/image/ab67616d0000b2738863bc310707e1fd1f87aa9f',
			progressMs: 30000,
			durationMs: 361000,
		})

		const { replies } = await simulateCommand('!song', {
			id: '12345',
			username: 'alice',
			displayName: 'Alice',
		})

		expect(replies).toHaveLength(1)
		expect(replies[0]).toBe('@Alice, Now playing: "After Hours by The Weeknd" - https://open.spotify.com/track/AfterHours')
	})

	it('should reply that no song is playing if the track is paused', async () => {
		// Mock token and currently playing state
		;(globalThis as any).__setMockSpotifyToken__({ id: 'streamer' })
		;(globalThis as any).__setMockCurrentlyPlaying__({
			title: 'After Hours',
			artist: 'The Weeknd',
			link: 'https://open.spotify.com/track/AfterHours',
			isPlaying: false,
			albumName: 'After Hours',
			albumArt: 'https://i.scdn.co/image/ab67616d0000b2738863bc310707e1fd1f87aa9f',
			progressMs: 0,
			durationMs: 361000,
		})

		const { replies } = await simulateCommand('!song', {
			id: '12345',
			username: 'alice',
			displayName: 'Alice',
		})

		expect(replies).toHaveLength(1)
		expect(replies[0]).toBe('@Alice, No song is currently playing on Spotify.')
	})
})
