import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import usernameGetHandler from '~~/server/api/points/[username].get'
import usernamePostHandler from '~~/server/api/points/[username].post'
import leaderboardHandler from '~~/server/api/points/leaderboard.get'
import { db } from '~~/server/database'
import { users } from '~~/server/database/schema'
import { clearDatabase, createTestUser } from '../helpers'

describe('Points API Routes in-process', () => {
	beforeEach(async () => {
		await clearDatabase()
		;(globalThis as any).__mockUsername__ = ''
	})

	describe('GET /api/points/leaderboard', () => {
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
	})

	describe('GET /api/points/[username]', () => {
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

	describe('POST /api/points/[username]', () => {
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
