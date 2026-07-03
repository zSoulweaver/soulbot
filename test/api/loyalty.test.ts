import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import usernameGetHandler from '~~/server/api/loyalty/[username].get'
import usernamePostHandler from '~~/server/api/loyalty/[username].post'
import gamblingLeaderboardHandler from '~~/server/api/loyalty/gambling/leaderboard.get'
import leaderboardHandler from '~~/server/api/loyalty/leaderboard.get'
import watchtimeLeaderboardHandler from '~~/server/api/loyalty/watchtime/leaderboard.get'
import { db } from '~~/server/database'
import { excludedUsers, users } from '~~/server/database/schema'
import { clearDatabase, createTestUser } from '../helpers'

describe('Loyalty API Routes in-process', () => {
	beforeEach(async () => {
		await clearDatabase()
		;(globalThis as any).__mockUsername__ = ''
	})

	describe('GET /api/loyalty/leaderboard', () => {
		it('should return empty leaderboard when no earners exist', async () => {
			const res = await leaderboardHandler({} as any)
			expect(res).toBeDefined()
			expect(res).toHaveLength(0)
		})

		it('should return sorted points leaders list', async () => {
			await createTestUser({ id: '1', username: 'alice', displayName: 'Alice', points: 300 })
			await createTestUser({ id: '2', username: 'bob', displayName: 'Bob', points: 500 })

			const res = await leaderboardHandler({} as any)
			expect(res).toHaveLength(2)
			expect(res[0]!.username).toBe('bob')
			expect(res[0]!.points).toBe(500)
			expect(res[1]!.username).toBe('alice')
			expect(res[1]!.points).toBe(300)
		})

		it('should return sorted points leaders list excluding bot and excluded users', async () => {
			// Excluded user
			await createTestUser({ id: '99', username: 'excluded', displayName: 'Excluded', points: 1000 })
			await db.insert(excludedUsers).values({
				id: '99',
				username: 'excluded',
				displayName: 'Excluded',
				reason: 'test',
			})
			// Valid users
			await createTestUser({ id: '1', username: 'alice', displayName: 'Alice', points: 300 })
			await createTestUser({ id: '2', username: 'bob', displayName: 'Bob', points: 500 })

			const res = await leaderboardHandler({} as any)
			expect(res).toHaveLength(2)
			expect(res[0]!.username).toBe('bob')
			expect(res[0]!.points).toBe(500)
			expect(res[1]!.username).toBe('alice')
			expect(res[1]!.points).toBe(300)
		})
	})

	describe('GET /api/loyalty/watchtime/leaderboard', () => {
		it('should return sorted watch time leader list excluding caster and excluded users', async () => {
			// Caster should be ignored
			await createTestUser({ id: '1', username: 'streamer', displayName: 'Streamer', watchTime: 1000, role: 'caster' })
			// Excluded user should be ignored
			await createTestUser({ id: '2', username: 'excludedguy', displayName: 'ExcludedGuy', watchTime: 500 })
			await db.insert(excludedUsers).values({
				id: '2',
				username: 'excludedguy',
				displayName: 'ExcludedGuy',
				reason: 'test',
			})
			// Valid viewers
			await createTestUser({ id: '3', username: 'alice', displayName: 'Alice', watchTime: 75 })
			await createTestUser({ id: '4', username: 'bob', displayName: 'Bob', watchTime: 120 })

			const res = await watchtimeLeaderboardHandler({} as any)
			expect(res).toHaveLength(2)
			expect(res[0]!.username).toBe('bob')
			expect(res[0]!.watchTime).toBe(120)
			expect(res[1]!.username).toBe('alice')
			expect(res[1]!.watchTime).toBe(75)
		})
	})

	describe('GET /api/loyalty/gambling/leaderboard', () => {
		it('should return empty lists when no users have gambled', async () => {
			const res = await gamblingLeaderboardHandler({} as any)
			expect(res).toBeDefined()
			expect(res.topGainers).toHaveLength(0)
			expect(res.topLosers).toHaveLength(0)
			expect(res.luckiest).toHaveLength(0)
			expect(res.unluckiest).toHaveLength(0)
		})

		it('should return correct lists for gainers, losers, luckiest, unluckiest', async () => {
			// Users for gainers and losers
			await createTestUser({ id: '1', username: 'alice', points: 1000, gambleWins: 5, gambleLosses: 5, gambleNetPoints: 500 })
			await createTestUser({ id: '2', username: 'bob', points: 200, gambleWins: 2, gambleLosses: 8, gambleNetPoints: -300 })
			await createTestUser({ id: '3', username: 'charlie', points: 2000, gambleWins: 8, gambleLosses: 2, gambleNetPoints: 1000 })

			// Users with few/no games (should be excluded from lucky/unlucky since total < 3)
			await createTestUser({ id: '4', username: 'david', points: 600, gambleWins: 1, gambleLosses: 0, gambleNetPoints: 100 })
			await createTestUser({ id: '5', username: 'eve', points: 400, gambleWins: 0, gambleLosses: 1, gambleNetPoints: -100 })

			const res = await gamblingLeaderboardHandler({} as any)

			// Top Gainers: Charlie (+1000), Alice (+500), David (+100)
			expect(res.topGainers).toHaveLength(3)
			expect(res.topGainers[0]!.username).toBe('charlie')
			expect(res.topGainers[1]!.username).toBe('alice')
			expect(res.topGainers[2]!.username).toBe('david')

			// Top Losers: Bob (-300), Eve (-100). Sorted ascending (most negative first)
			expect(res.topLosers).toHaveLength(2)
			expect(res.topLosers[0]!.username).toBe('bob')
			expect(res.topLosers[1]!.username).toBe('eve')

			// Luckiest (total >= 3):
			// Charlie: 8 wins, 2 losses (80% raw win rate)
			// Alice: 5 wins, 5 losses (50% raw win rate)
			// Bob: 2 wins, 8 losses (20% raw win rate)
			expect(res.luckiest).toHaveLength(3)
			expect(res.luckiest[0]!.username).toBe('charlie')
			expect(res.luckiest[1]!.username).toBe('alice')
			expect(res.luckiest[2]!.username).toBe('bob')

			// Unluckiest (total >= 3):
			// Bob (20%), Alice (50%), Charlie (80%)
			expect(res.unluckiest).toHaveLength(3)
			expect(res.unluckiest[0]!.username).toBe('bob')
			expect(res.unluckiest[1]!.username).toBe('alice')
			expect(res.unluckiest[2]!.username).toBe('charlie')
		})
	})

	describe('GET /api/loyalty/[username]', () => {
		it('should return 404 if the user does not exist in DB', async () => {
			;(globalThis as any).__mockUsername__ = 'nonexistent'
			await expect(async () => {
				await usernameGetHandler({} as any)
			}).rejects.toThrow()

			try {
				await usernameGetHandler({} as any)
			}
			catch (err: any) {
				expect(err.statusCode).toBe(404)
			}
		})

		it('should return correct user details and points total', async () => {
			await createTestUser({ id: '123', username: 'alice', displayName: 'Alice', points: 150 })

			;(globalThis as any).__mockUsername__ = 'alice'
			const res = await usernameGetHandler({} as any)
			expect(res).toBeDefined()
			expect(res.points).toBe(150)
		})
	})

	describe('POST /api/loyalty/[username]', () => {
		it('should fail with 400 Bad Request if parameters are invalid', async () => {
			await createTestUser({ id: '123', username: 'alice', displayName: 'Alice', points: 100 })

			;(globalThis as any).__mockUsername__ = 'alice'
			try {
				await usernamePostHandler({
					body: { amount: 'invalid-string' },
				} as any)
				expect.fail('Should have failed')
			}
			catch (err: any) {
				expect(err.statusCode).toBe(400)
			}
		})

		it('should add points to user and update DB successfully', async () => {
			await createTestUser({ id: '123', username: 'alice', displayName: 'Alice', points: 100 })

			;(globalThis as any).__mockUsername__ = 'alice'
			const res = await usernamePostHandler({
				body: { amount: 75, mode: 'add' },
			} as any)

			expect(res.points).toBe(175)

			const aliceRecord = await db.select().from(users).where(eq(users.id, '123')).then(res => res[0])
			expect(aliceRecord?.points).toBe(175)
		})

		it('should set points of user directly in DB successfully', async () => {
			await createTestUser({ id: '123', username: 'alice', displayName: 'Alice', points: 100 })

			;(globalThis as any).__mockUsername__ = 'alice'
			const res = await usernamePostHandler({
				body: { amount: 250, mode: 'set' },
			} as any)

			expect(res.points).toBe(250)

			const aliceRecord = await db.select().from(users).where(eq(users.id, '123')).then(res => res[0])
			expect(aliceRecord?.points).toBe(250)
		})
	})
})
