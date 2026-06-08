import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '~~/server/database'
import { twitchTokens } from '~~/server/database/schema'
import { getStreamerToken } from '~~/server/utils/twurple'
import { clearDatabase, simulateCommand } from '../helpers'
import { mockApiClient, mockGetStreamInfo } from '../setup'

describe('Bot Twitch Commands Integration', () => {
	beforeEach(async () => {
		await clearDatabase()
		vi.restoreAllMocks()

		// Seed a streamer token
		await db.insert(twitchTokens).values({
			accountType: 'streamer',
			userId: 'streamer-id-123',
			userName: 'streamerchannel',
			displayName: 'StreamerChannel',
			accessToken: 'access',
			refreshToken: 'refresh',
			scope: '[]',
			obtainmentTimestamp: Date.now(),
		})

		// Force refresh in-memory cache to load our seeded token
		await getStreamerToken(true)
	})

	describe('!followage - View own follow duration', () => {
		it('should reply with follow age if the user is following the channel', async () => {
			const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 - 10 * 1000)

			mockApiClient.channels.getChannelFollowers.mockResolvedValueOnce({
				data: [
					{
						userId: 'mock-alice-id',
						userName: 'alice',
						userDisplayName: 'Alice',
						followDate: fiveDaysAgo,
					},
				],
				total: 1,
			})

			const { replies } = await simulateCommand('!followage', {
				id: '12345',
				username: 'alice',
				displayName: 'Alice',
			})

			expect(replies).toHaveLength(1)
			expect(replies[0]).toBe('@Alice, you have been following for 5 days, 10 seconds.')
		})

		it('should reply that the user is not following if Twitch returns no follow records', async () => {
			mockApiClient.channels.getChannelFollowers.mockResolvedValueOnce({
				data: [],
				total: 0,
			})

			const { replies } = await simulateCommand('!followage', {
				id: '12345',
				username: 'alice',
				displayName: 'Alice',
			})

			expect(replies).toHaveLength(1)
			expect(replies[0]).toBe('@Alice, you are not following this channel.')
		})
	})

	describe('!followage <username> - View another user\'s follow duration', () => {
		it('should reply with target user\'s follow age if they follow the channel', async () => {
			const targetDate = new Date(Date.now() - (365 * 24 * 60 * 60 * 1000 + 45 * 24 * 60 * 60 * 1000))

			mockApiClient.channels.getChannelFollowers.mockResolvedValueOnce({
				data: [
					{
						userId: 'mock-bob-id',
						userName: 'bob',
						userDisplayName: 'Bob',
						followDate: targetDate,
					},
				],
				total: 1,
			})

			const { replies } = await simulateCommand('!followage bob', {
				id: '12345',
				username: 'alice',
				displayName: 'Alice',
			})

			expect(replies).toHaveLength(1)
			expect(replies[0]).toBe('@Alice, Bob has been following for 1 year, 1 month, 15 days.')
		})

		it('should reply that target user is not following if Twitch returns no follow records', async () => {
			mockApiClient.channels.getChannelFollowers.mockResolvedValueOnce({
				data: [],
				total: 0,
			})

			const { replies } = await simulateCommand('!followage bob', {
				id: '12345',
				username: 'alice',
				displayName: 'Alice',
			})

			expect(replies).toHaveLength(1)
			expect(replies[0]).toBe('@Alice, Bob is not following this channel.')
		})

		it('should reply that the user could not be found if target is nonexistent', async () => {
			const { replies } = await simulateCommand('!followage nonexistent', {
				id: '12345',
				username: 'alice',
				displayName: 'Alice',
			})

			expect(replies).toHaveLength(1)
			expect(replies[0]).toBe('@Alice, Twitch user nonexistent could not be found.')
		})
	})

	describe('!uptime - View stream uptime', () => {
		it('should reply with the current uptime if the stream is online', async () => {
			// 1 hour, 2 minutes, 5 seconds = 3600 + 120 + 5 = 3725 seconds
			mockGetStreamInfo.mockResolvedValueOnce({
				isOnline: true,
				uptime: 3725,
			})

			const { replies } = await simulateCommand('!uptime', {
				id: '12345',
				username: 'alice',
				displayName: 'Alice',
			})

			expect(replies).toHaveLength(1)
			expect(replies[0]).toBe('@Alice, The stream has been live for 1 hour, 2 minutes, 5 seconds.')
		})

		it('should reply that the stream is offline if the stream is offline', async () => {
			mockGetStreamInfo.mockResolvedValueOnce({
				isOnline: false,
			})

			const { replies } = await simulateCommand('!uptime', {
				id: '12345',
				username: 'alice',
				displayName: 'Alice',
			})

			expect(replies).toHaveLength(1)
			expect(replies[0]).toBe('@Alice, The stream is currently offline.')
		})
	})
})
