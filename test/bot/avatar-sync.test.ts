import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
	getTopLeaderboardUsers,
	startAvatarSyncEngine,
	stopAvatarSyncEngine,
	syncLeaderboardAvatars,
} from '~~/server/bot/services/avatar-sync'
import { db } from '~~/server/database'
import { excludedUsers, twitchTokens, users } from '~~/server/database/schema'
import { clearDatabase, createTestUser } from '../helpers'

describe('Avatar Sync Service', () => {
	beforeEach(async () => {
		await clearDatabase()
		stopAvatarSyncEngine()

		// Seed a streamer token so sync doesn't skip
		await db.insert(twitchTokens).values({
			accountType: 'streamer',
			userId: 'streamer-123',
			userName: 'streamer',
			displayName: 'Streamer',
			accessToken: 'mock-access',
			refreshToken: 'mock-refresh',
			obtainmentTimestamp: Date.now(),
			scope: JSON.stringify(['chat']),
		})
	})

	afterEach(() => {
		stopAvatarSyncEngine()
	})

	it('should return empty list when no users exist', async () => {
		const leaderboardUsers = await getTopLeaderboardUsers()
		expect(leaderboardUsers).toHaveLength(0)
	})

	it('should collect unique top users across points, watch time, and gambling', async () => {
		await createTestUser({ id: '1', username: 'user1', points: 500, watchTime: 100 })
		await createTestUser({ id: '2', username: 'user2', points: 100, watchTime: 800 })
		await createTestUser({ id: '3', username: 'user3', points: 50, watchTime: 50, gambleNetPoints: 300 })
		await createTestUser({ id: '4', username: 'excluded', points: 900 })

		// Exclude user 4
		await db.insert(excludedUsers).values({
			id: '4',
			username: 'excluded',
			displayName: 'Excluded',
			reason: 'Bot',
		})

		const leaderboardUsers = await getTopLeaderboardUsers()
		const ids = leaderboardUsers.map(u => u.id)

		expect(ids).toContain('1')
		expect(ids).toContain('2')
		expect(ids).toContain('3')
		expect(ids).not.toContain('4')
	})

	it('should sync missing avatars for top users', async () => {
		await createTestUser({ id: '101', username: 'user101', points: 500, image: null })
		await createTestUser({ id: '102', username: 'user102', points: 400, image: 'https://existing.png' })

		const updated = await syncLeaderboardAvatars({ missingOnly: true })
		expect(updated).toBe(1)

		const [user101] = await db.select().from(users).where(eq(users.id, '101'))
		expect(user101?.image).toBe('https://static-cdn.jtvnw.net/user_101.jpg')

		const [user102] = await db.select().from(users).where(eq(users.id, '102'))
		expect(user102?.image).toBe('https://existing.png')
	})

	it('should do full refresh when missingOnly is false', async () => {
		await createTestUser({ id: '201', username: 'user201', points: 500, image: 'https://old.png' })

		const updated = await syncLeaderboardAvatars({ missingOnly: false })
		expect(updated).toBe(1)

		const [user201] = await db.select().from(users).where(eq(users.id, '201'))
		expect(user201?.image).toBe('https://static-cdn.jtvnw.net/user_201.jpg')
	})

	it('should start and stop avatar sync engine without error', () => {
		expect(() => startAvatarSyncEngine()).not.toThrow()
		expect(() => stopAvatarSyncEngine()).not.toThrow()
	})
})
