import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { transferPoints, updateUserPoints, updateUserPointsAndGambleStats } from '~~/server/bot/modules/points/service'
import { db } from '~~/server/database'
import { users } from '~~/server/database/schema'
import { clearDatabase } from '../helpers'

describe('Points Service Atomic Operations', () => {
	beforeEach(async () => {
		await clearDatabase()
	})

	it('should atomically add and set points', async () => {
		await db.insert(users).values({
			id: 'u1',
			username: 'alice',
			displayName: 'Alice',
			points: 100,
		})

		const added = await updateUserPoints('alice', 50, 'add')
		expect(added?.points).toBe(150)

		const setRes = await updateUserPoints('alice', 300, 'set')
		expect(setRes?.points).toBe(300)
	})

	it('should atomically deduct points when balance is sufficient', async () => {
		await db.insert(users).values({
			id: 'u1',
			username: 'alice',
			displayName: 'Alice',
			points: 100,
		})

		const deducted = await updateUserPoints('alice', -40, 'add')
		expect(deducted?.points).toBe(60)
	})

	it('should reject deduction and return null if balance is insufficient', async () => {
		await db.insert(users).values({
			id: 'u1',
			username: 'alice',
			displayName: 'Alice',
			points: 30,
		})

		const deducted = await updateUserPoints('alice', -50, 'add')
		expect(deducted).toBeNull()

		// Verify database points untouched
		const [user] = await db.select().from(users)
		expect(user?.points).toBe(30)
	})

	it('should atomically update gamble stats and clamp negative net loss', async () => {
		await db.insert(users).values({
			id: 'u1',
			username: 'alice',
			displayName: 'Alice',
			points: 100,
			gambleWins: 0,
			gambleLosses: 0,
			gambleNetPoints: 0,
		})

		const win = await updateUserPointsAndGambleStats('alice', 50, true)
		expect(win?.points).toBe(150)
		expect(win?.gambleWins).toBe(1)
		expect(win?.gambleNetPoints).toBe(50)

		const loss = await updateUserPointsAndGambleStats('alice', 30, false)
		expect(loss?.points).toBe(120)
		expect(loss?.gambleLosses).toBe(1)
		expect(loss?.gambleNetPoints).toBe(20)
	})

	it('should atomically transfer points between two users', async () => {
		await db.insert(users).values([
			{ id: 'u1', username: 'alice', displayName: 'Alice', points: 100 },
			{ id: 'u2', username: 'bob', displayName: 'Bob', points: 50 },
		])

		const result = await transferPoints('alice', 'bob', 40)
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.sender.points).toBe(60)
			expect(result.target.points).toBe(90)
		}
	})

	it('should prevent point duplication on concurrent transfer race', async () => {
		await db.insert(users).values([
			{ id: 'u1', username: 'alice', displayName: 'Alice', points: 100 },
			{ id: 'u2', username: 'bob', displayName: 'Bob', points: 0 },
		])

		// Simulate two simultaneous transfers of 100 points
		const [res1, res2] = await Promise.all([
			transferPoints('alice', 'bob', 100),
			transferPoints('alice', 'bob', 100),
		])

		const successes = [res1, res2].filter(r => r.success)
		const failures = [res1, res2].filter(r => !r.success)

		expect(successes.length).toBe(1)
		expect(failures.length).toBe(1)

		const [alice] = await db.select().from(users).where(eq(users.username, 'alice'))
		const [bob] = await db.select().from(users).where(eq(users.username, 'bob'))

		expect(alice?.points).toBe(0)
		expect(bob?.points).toBe(100)
	})
})
