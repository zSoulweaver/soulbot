import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '~~/server/database'
import { twitchTokens } from '~~/server/database/schema'
import { getTwitchUserRole } from '~~/server/utils/twurple'
import { mockApiClient } from '../setup'

describe('getTwitchUserRole utility', () => {
	beforeEach(async () => {
		vi.clearAllMocks()
		await db.delete(twitchTokens)

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
	})

	it('should return caster role if the user ID is the streamer ID', async () => {
		const res = await getTwitchUserRole('streamer-id-123')
		expect(res.role).toBe('caster')
		expect(res.isVip).toBe(false)
		expect(res.isSubscriber).toBe(false)
	})

	it('should return moderator role if checkUserMod resolves to true', async () => {
		mockApiClient.moderation.checkUserMod.mockResolvedValueOnce(true)

		const res = await getTwitchUserRole('some-mod-id')
		expect(res.role).toBe('moderator')
		expect(mockApiClient.asUser).toHaveBeenCalledWith('streamer-id-123', expect.any(Function))
		expect(mockApiClient.moderation.checkUserMod).toHaveBeenCalledWith('streamer-id-123', 'some-mod-id')
	})

	it('should set isVip to true if user is in VIP list', async () => {
		mockApiClient.channels.getVips.mockResolvedValueOnce({
			data: [{ id: 'some-vip-id', name: 'vipuser' }],
		})

		const res = await getTwitchUserRole('some-vip-id')
		expect(res.isVip).toBe(true)
		expect(res.role).toBe('viewer')
		expect(mockApiClient.channels.getVips).toHaveBeenCalledWith('streamer-id-123')
	})

	it('should set isSubscriber to true if user has a subscriber subscription', async () => {
		mockApiClient.subscriptions.getSubscriptionForUser.mockResolvedValueOnce(true)

		const res = await getTwitchUserRole('some-sub-id')
		expect(res.isSubscriber).toBe(true)
		expect(res.role).toBe('viewer')
		expect(mockApiClient.subscriptions.getSubscriptionForUser).toHaveBeenCalledWith('streamer-id-123', 'some-sub-id')
	})
})
