import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '~~/server/database'
import { twitchTokens } from '~~/server/database/schema'
import { clearDatabase, simulateCommand } from '../helpers'
import { mockApiClient } from '../setup'

describe('Bot Advertisements Command Integration', () => {
	beforeEach(async () => {
		await clearDatabase()

		// Seed broadcaster twitch credentials
		await db.insert(twitchTokens).values({
			accountType: 'streamer',
			userId: 'streamer-id',
			userName: 'streamer',
			displayName: 'Streamer',
			accessToken: 'mock-access',
			refreshToken: 'mock-refresh',
			expiresIn: 3600,
			obtainmentTimestamp: Date.now(),
			scope: JSON.stringify([]),
		})

		vi.clearAllMocks()
	})

	describe('!commercial - Run Commercial Break', () => {
		it('should start 30s commercial break by default if no arguments provided', async () => {
			const { replies } = await simulateCommand('!commercial', {
				id: '12345',
				username: 'moderator',
				displayName: 'ModeratorUser',
				role: 'moderator',
			})

			expect(mockApiClient.channels.startChannelCommercial).toHaveBeenCalledWith('streamer-id', 30)
			expect(replies).toHaveLength(1)
			expect(replies[0]).toBe('@ModeratorUser, Successfully started a 30 second commercial break.')
		})

		it('should start commercial break with specified duration', async () => {
			const { replies } = await simulateCommand('!commercial 90', {
				id: '12345',
				username: 'moderator',
				displayName: 'ModeratorUser',
				role: 'moderator',
			})

			expect(mockApiClient.channels.startChannelCommercial).toHaveBeenCalledWith('streamer-id', 90)
			expect(replies).toHaveLength(1)
			expect(replies[0]).toBe('@ModeratorUser, Successfully started a 90 second commercial break.')
		})

		it('should reply with error if invalid duration is provided', async () => {
			const { replies } = await simulateCommand('!commercial 45', {
				id: '12345',
				username: 'moderator',
				displayName: 'ModeratorUser',
				role: 'moderator',
			})

			expect(mockApiClient.channels.startChannelCommercial).not.toHaveBeenCalled()
			expect(replies).toHaveLength(1)
			expect(replies[0]).toContain('Incorrect usage')
		})

		it('should block non-moderators/non-casters from running commercials', async () => {
			const { replies } = await simulateCommand('!commercial', {
				id: '12345',
				username: 'viewer',
				displayName: 'ViewerUser',
				role: 'viewer',
			})

			expect(mockApiClient.channels.startChannelCommercial).not.toHaveBeenCalled()
			expect(replies).toHaveLength(0) // Should be silently dropped by permissionsMiddleware
		})

		it('should handle API errors gracefully and reply with error details', async () => {
			vi.mocked(mockApiClient.channels.startChannelCommercial).mockRejectedValueOnce(new Error('Twitch API offline'))

			const { replies } = await simulateCommand('!commercial 60', {
				id: '12345',
				username: 'moderator',
				displayName: 'ModeratorUser',
				role: 'moderator',
			})

			expect(replies).toHaveLength(1)
			expect(replies[0]).toBe('@ModeratorUser, Failed to start commercial: Twitch API offline')
		})
	})

	describe('!commercial snooze - Snooze Upcoming Ad', () => {
		it('should snooze the upcoming scheduled ad break successfully', async () => {
			const { replies } = await simulateCommand('!commercial snooze', {
				id: '12345',
				username: 'moderator',
				displayName: 'ModeratorUser',
				role: 'moderator',
			})

			expect(mockApiClient.channels.snoozeNextAd).toHaveBeenCalledWith('streamer-id')
			expect(replies).toHaveLength(1)
			expect(replies[0]).toBe('@ModeratorUser, Successfully snoozed upcoming ad. Remaining snoozes: 2.')
		})

		it('should handle snooze API failures gracefully', async () => {
			vi.mocked(mockApiClient.channels.snoozeNextAd).mockRejectedValueOnce(new Error('No snoozes remaining'))

			const { replies } = await simulateCommand('!commercial snooze', {
				id: '12345',
				username: 'moderator',
				displayName: 'ModeratorUser',
				role: 'moderator',
			})

			expect(replies).toHaveLength(1)
			expect(replies[0]).toBe('@ModeratorUser, Failed to snooze ad: No snoozes remaining')
		})

		it('should block non-moderators/non-casters from snoozing', async () => {
			const { replies } = await simulateCommand('!commercial snooze', {
				id: '12345',
				username: 'viewer',
				displayName: 'ViewerUser',
				role: 'viewer',
			})

			expect(mockApiClient.channels.snoozeNextAd).not.toHaveBeenCalled()
			expect(replies).toHaveLength(0)
		})
	})
})
