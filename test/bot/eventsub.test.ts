import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { eventSubManager } from '~~/server/bot/core/eventsub'
import { db } from '~~/server/database'
import { settings, twitchTokens, users } from '~~/server/database/schema'
import { refreshAppSettingsCache } from '~~/server/utils/settings'
import { clearDatabase } from '../helpers'
import { mockSay } from '../setup'

describe('Bot EventSub Integration', () => {
	beforeEach(async () => {
		await clearDatabase()

		// 1. Seed a mock streamer token so that alert handlers can look up the streamer channel name
		await db.insert(twitchTokens).values({
			accountType: 'streamer',
			userId: 'streamer-id',
			userName: 'streamerchannel',
			displayName: 'StreamerChannel',
			accessToken: 'mock-access',
			refreshToken: 'mock-refresh',
			scope: '[]',
			obtainmentTimestamp: Date.now(),
		})

		// Reset settings cache
		await refreshAppSettingsCache()
	})

	describe('Follow EventSub Alerts & Rewards', () => {
		it('should bypass points and alerts when disabled (default state)', async () => {
			await eventSubManager.simulate('follow', {
				userId: 'mock-alice-id',
				userName: 'alice',
				userDisplayName: 'Alice',
			} as any)

			// Alice should not have been created or rewarded points
			const userRecord = await db.select().from(users).where(eq(users.id, 'mock-alice-id')).then(res => res[0])
			expect(userRecord).toBeUndefined()

			// No chat alert should be posted
			expect(mockSay).not.toHaveBeenCalled()
		})

		it('should reward points and post alert when toggled ON in settings', async () => {
			// Enable follow settings in database
			await db.insert(settings).values([
				{ key: 'eventsub.points.follow.enabled', value: 'true', updatedAt: new Date() },
				{ key: 'eventsub.points.follow', value: '150', updatedAt: new Date() },
				{ key: 'eventsub.alert.follow.enabled', value: 'true', updatedAt: new Date() },
				{ key: 'eventsub.alert.follow', value: 'Thank you for following, $(sender)! You have $(points) points.', updatedAt: new Date() },
			])
			await refreshAppSettingsCache()

			await eventSubManager.simulate('follow', {
				userId: 'mock-alice-id',
				userName: 'alice',
				userDisplayName: 'Alice',
			} as any)

			// Alice should be created with 150 points
			const userRecord = await db.select().from(users).where(eq(users.id, 'mock-alice-id')).then(res => res[0])
			expect(userRecord).toBeDefined()
			expect(userRecord?.points).toBe(150)

			// Alert should be rendered with variables and sent to chat client
			expect(mockSay).toHaveBeenCalledTimes(1)
			expect(mockSay.mock.calls[0]?.[0]).toBe('streamerchannel')
			expect(mockSay.mock.calls[0]?.[1]).toBe('Thank you for following, Alice! You have 150 points.')
		})
	})

	describe('Subscription EventSub Alerts & Rewards', () => {
		it('should award points and alert for a subscriber when toggled ON', async () => {
			await db.insert(settings).values([
				{ key: 'eventsub.points.sub.enabled', value: 'true', updatedAt: new Date() },
				{ key: 'eventsub.points.sub', value: '500', updatedAt: new Date() },
				{ key: 'eventsub.alert.sub.enabled', value: 'true', updatedAt: new Date() },
				{ key: 'eventsub.alert.sub', value: 'Welcome to the club, $(sender)!', updatedAt: new Date() },
			])
			await refreshAppSettingsCache()

			await eventSubManager.simulate('subscription', {
				userId: 'mock-bob-id',
				userName: 'bob',
				userDisplayName: 'Bob',
				tier: '1000',
				isGift: false,
			} as any)

			const userRecord = await db.select().from(users).where(eq(users.id, 'mock-bob-id')).then(res => res[0])
			expect(userRecord?.points).toBe(500)

			expect(mockSay).toHaveBeenCalledTimes(1)
			expect(mockSay.mock.calls[0]?.[1]).toBe('Welcome to the club, Bob!')
		})
	})

	describe('Gift Subscription EventSub Alerts & Rewards', () => {
		it('should award points to the gifter and alert the chat when toggled ON', async () => {
			await db.insert(settings).values([
				{ key: 'eventsub.points.gift.enabled', value: 'true', updatedAt: new Date() },
				{ key: 'eventsub.points.gift', value: '250', updatedAt: new Date() },
				{ key: 'eventsub.alert.gift.enabled', value: 'true', updatedAt: new Date() },
				{ key: 'eventsub.alert.gift', value: 'Thank you @$(sender) for gifting $(giftCount) sub(s) to the community!', updatedAt: new Date() },
			])
			await refreshAppSettingsCache()

			await eventSubManager.simulate('subscription.gift', {
				gifterId: 'mock-gifter-id',
				gifterName: 'gifter',
				gifterDisplayName: 'Gifter',
				tier: '1000',
				amount: 5,
			} as any)

			// Gifter gets rewarded points
			const userRecord = await db.select().from(users).where(eq(users.id, 'mock-gifter-id')).then(res => res[0])
			expect(userRecord?.points).toBe(250)

			expect(mockSay).toHaveBeenCalledTimes(1)
			expect(mockSay.mock.calls[0]?.[1]).toBe('Thank you @Gifter for gifting 5 sub(s) to the community!')
		})
	})

	describe('Cheer EventSub Alerts & Rewards', () => {
		it('should reward multiplier-scaled points and alert on cheer events when toggled ON', async () => {
			await db.insert(settings).values([
				{ key: 'eventsub.points.cheer.enabled', value: 'true', updatedAt: new Date() },
				{ key: 'eventsub.points.cheer', value: '3', updatedAt: new Date() }, // 3 points per bit
				{ key: 'eventsub.alert.cheer.enabled', value: 'true', updatedAt: new Date() },
				{ key: 'eventsub.alert.cheer', value: 'Thank you @$(sender) for cheering $(bitsCount) bits! Msg: $(cheerMessage)', updatedAt: new Date() },
			])
			await refreshAppSettingsCache()

			await eventSubManager.simulate('cheer', {
				userId: 'mock-dan-id',
				userName: 'dan',
				userDisplayName: 'Dan',
				bits: 100,
				message: 'Keep up the good work!',
			} as any)

			// Dan gets 3 * 100 = 300 points
			const userRecord = await db.select().from(users).where(eq(users.id, 'mock-dan-id')).then(res => res[0])
			expect(userRecord?.points).toBe(300)

			expect(mockSay).toHaveBeenCalledTimes(1)
			expect(mockSay.mock.calls[0]?.[1]).toBe('Thank you @Dan for cheering 100 bits! Msg: Keep up the good work!')
		})
	})
})
