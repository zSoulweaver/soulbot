import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import idDeleteHandler from '~~/server/api/points/exclusions/[id].delete'
import indexGetHandler from '~~/server/api/points/exclusions/index.get'
import indexPostHandler from '~~/server/api/points/exclusions/index.post'
import { db } from '~~/server/database'
import { excludedUsers, twitchTokens } from '~~/server/database/schema'
import { clearDatabase } from '../helpers'

describe('Points Exclusions API Routes in-process', () => {
	beforeEach(async () => {
		await clearDatabase()
	})

	describe('GET /api/points/exclusions', () => {
		it('should return manual and auto exclusions', async () => {
			await db.insert(twitchTokens).values({
				accountType: 'bot',
				userId: 'bot-id',
				userName: 'soulbot',
				displayName: 'Soulbot',
				accessToken: 'acc',
				refreshToken: 'ref',
				scope: '[]',
				obtainmentTimestamp: Date.now(),
			})

			await db.insert(excludedUsers).values({
				id: 'exc-1',
				username: 'streamelements',
				displayName: 'StreamElements',
				reason: 'System Bot',
				createdAt: new Date(),
			})

			const res = await indexGetHandler({} as any)
			expect(res.autoExclusions).toHaveLength(1)
			expect((res.autoExclusions as any)[0].username).toBe('soulbot')

			expect(res.manualExclusions.data).toHaveLength(1)
			expect((res.manualExclusions.data as any)[0].username).toBe('streamelements')
			expect(res.manualExclusions.meta.total).toBe(1)
			expect(res.manualExclusions.meta.page).toBe(1)
		})
	})

	describe('POST /api/points/exclusions', () => {
		it('should fail if user does not exist on Twitch', async () => {
			try {
				await indexPostHandler({
					body: { username: 'nonexistent', reason: 'Test' },
				} as any)
				expect.fail('Should have failed')
			}
			catch (err: any) {
				expect(err.statusCode).toBe(404)
			}
		})

		it('should add a valid exclusion', async () => {
			const res = await indexPostHandler({
				body: { username: 'validuser', reason: 'Spammer' },
			} as any)

			expect(res.success).toBe(true)
			expect(res.user!.username).toBe('validuser')

			const dbUser = await db.select().from(excludedUsers).where(eq(excludedUsers.username, 'validuser')).then(res => res[0])
			expect(dbUser).toBeDefined()
			expect(dbUser?.reason).toBe('Spammer')
		})

		it('should fail if already excluded', async () => {
			await db.insert(excludedUsers).values({
				id: 'mock-already-id',
				username: 'already',
				displayName: 'Already',
				reason: 'Existing',
				createdAt: new Date(),
			})

			try {
				await indexPostHandler({
					body: { username: 'already' },
				} as any)
				expect.fail('Should have failed')
			}
			catch (err: any) {
				expect(err.statusCode).toBe(400)
			}
		})

		it('should fail if attempting to exclude system bot', async () => {
			await db.insert(twitchTokens).values({
				accountType: 'bot',
				userId: 'mock-botuser-id',
				userName: 'botuser',
				displayName: 'Botuser',
				accessToken: 'acc',
				refreshToken: 'ref',
				scope: '[]',
				obtainmentTimestamp: Date.now(),
			})

			try {
				await indexPostHandler({
					body: { username: 'botuser' },
				} as any)
				expect.fail('Should have failed')
			}
			catch (err: any) {
				expect(err.statusCode).toBe(400)
				expect(err.statusMessage).toContain('system bot')
			}
		})
	})

	describe('DELETE /api/points/exclusions/[id]', () => {
		it('should delete an exclusion', async () => {
			await db.insert(excludedUsers).values({
				id: 'to-delete',
				username: 'todelete',
				displayName: 'ToDelete',
				reason: null,
				createdAt: new Date(),
			})

			;(globalThis as any).getRouterParam = vi.fn((event, paramName) => {
				if (paramName === 'id')
					return 'to-delete'
				return undefined
			})

			const res = await idDeleteHandler({} as any)
			expect(res.success).toBe(true)

			const dbUser = await db.select().from(excludedUsers).where(eq(excludedUsers.id, 'to-delete')).then(res => res[0])
			expect(dbUser).toBeUndefined()
		})
	})
})
