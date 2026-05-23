import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { activeUsersMap, executePayoutCycle, trackActiveUser } from '~~/server/bot/modules/points/payout'
import { db } from '~~/server/database'
import { settings, twitchTokens, users } from '~~/server/database/schema'
import { refreshAppSettingsCache } from '~~/server/utils/settings'
import { clearDatabase } from '../helpers'
import { mockApiClient, mockGetStreamInfo } from '../setup'

// Paginator mock for Twurple getChattersPaginated
const mockChattersPaginator = {
	getAll: vi.fn(),
}
;(mockApiClient as any).chat = {
	getChattersPaginated: vi.fn(() => mockChattersPaginator),
}

describe('Points Payout Engine Cycle', () => {
	beforeEach(async () => {
		await clearDatabase()
		activeUsersMap.clear()
		vi.clearAllMocks()

		// Seed a streamer token
		await db.insert(twitchTokens).values({
			accountType: 'streamer',
			userId: 'streamer-id-123',
			userName: 'streamer',
			displayName: 'Streamer',
			accessToken: 'access',
			refreshToken: 'refresh',
			scope: '[]',
			obtainmentTimestamp: Date.now(),
		})
	})

	it('should award base points to all chatters and active bonus to active chatters when online', async () => {
		// Mock streamer as online
		mockGetStreamInfo.mockResolvedValue({ isOnline: true })

		// Configure custom settings
		await db.insert(settings).values([
			{ key: 'points.payout_amount', value: '10', updatedAt: new Date() },
			{ key: 'points.active_bonus', value: '5', updatedAt: new Date() },
		])
		await refreshAppSettingsCache()

		// Mock chatters connected in Twitch chat: user1 (active) and user2 (lurker)
		mockChattersPaginator.getAll.mockResolvedValue([
			{ userId: 'u1', userName: 'user1', userDisplayName: 'UserOne' },
			{ userId: 'u2', userName: 'user2', userDisplayName: 'UserTwo' },
		])

		// Mark user1 as active
		trackActiveUser('u1', 'user1', 'UserOne')

		// Execute the cycle!
		await executePayoutCycle()

		// Verify database points:
		// Active user1 (u1) should get: 10 (base) + 5 (bonus) = 15 points
		const u1Record = await db.select().from(users).where(eq(users.id, 'u1')).then(res => res[0])
		expect(u1Record).toBeDefined()
		expect(u1Record?.points).toBe(15)

		// Lurker user2 (u2) should get: 10 (base) = 10 points
		const u2Record = await db.select().from(users).where(eq(users.id, 'u2')).then(res => res[0])
		expect(u2Record).toBeDefined()
		expect(u2Record?.points).toBe(10)

		// Active map should be successfully cleared post-cycle
		expect(activeUsersMap.size).toBe(0)
	})

	it('should skip Twurple/DB logic completely when offline and offline payout is 0 (zero-waste)', async () => {
		// Mock streamer as offline
		mockGetStreamInfo.mockResolvedValue({ isOnline: false })

		// Configure offline payout as 0
		await db.insert(settings).values([
			{ key: 'points.payout_amount_offline', value: '0', updatedAt: new Date() },
		])
		await refreshAppSettingsCache()

		// Mark a user as active just in case
		trackActiveUser('u1', 'user1', 'UserOne')

		// Run cycle
		await executePayoutCycle()

		// Verify zero paginator calls and zero database user insertions
		expect(mockChattersPaginator.getAll).not.toHaveBeenCalled()

		const allUsers = await db.select().from(users)
		expect(allUsers).toHaveLength(0)

		// Active users map should NOT be cleared if skipped (since they sent messages while offline, we keep them active for when streamer goes online!)
		expect(activeUsersMap.size).toBe(1)
	})

	it('should award offline points to connected chatters when offline and payout is configured > 0', async () => {
		// Mock streamer as offline
		mockGetStreamInfo.mockResolvedValue({ isOnline: false })

		// Configure offline payout as 3 points and active bonus as 2 points
		await db.insert(settings).values([
			{ key: 'points.payout_amount_offline', value: '3', updatedAt: new Date() },
			{ key: 'points.active_bonus', value: '2', updatedAt: new Date() },
		])
		await refreshAppSettingsCache()

		mockChattersPaginator.getAll.mockResolvedValue([
			{ userId: 'u1', userName: 'user1', userDisplayName: 'UserOne' },
		])

		// Mark user1 as active
		trackActiveUser('u1', 'user1', 'UserOne')

		await executePayoutCycle()

		// Active user1 should get offline payout (3) and no active bonus (active bonus only applies online) = 3 points
		const record = await db.select().from(users).where(eq(users.id, 'u1')).then(res => res[0])
		expect(record?.points).toBe(3)
		expect(activeUsersMap.size).toBe(0)
	})
})
