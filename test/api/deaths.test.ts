import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import deleteDeathsHandler from '~~/server/api/admin/deaths/[id].delete'
import getDeathsHandler from '~~/server/api/admin/deaths/index.get'
import postDeathsHandler from '~~/server/api/admin/deaths/index.post'
import { db } from '~~/server/database'
import { gameDeaths } from '~~/server/database/schema'
import { clearDatabase } from '../helpers'

describe('Deaths API Endpoints', () => {
	beforeEach(async () => {
		await clearDatabase()
		await db.delete(gameDeaths)
	})

	describe('GET /api/admin/deaths', () => {
		it('should list game death records paginated', async () => {
			const mockGetQuery = (globalThis as any).getQuery
			mockGetQuery.mockReturnValueOnce({ page: '1', limit: '10' })

			await db.insert(gameDeaths).values([
				{ gameName: 'Elden Ring', deaths: 50 },
				{ gameName: 'Dark Souls', deaths: 30 },
			])

			const res = await getDeathsHandler({} as any)

			expect(res.data).toHaveLength(2)
			expect(res.meta.total).toBe(2)
			expect(res.currentGame).toBeDefined()
		})

		it('should filter game deaths by search query', async () => {
			const mockGetQuery = (globalThis as any).getQuery
			mockGetQuery.mockReturnValueOnce({ search: 'Elden' })

			await db.insert(gameDeaths).values([
				{ gameName: 'Elden Ring', deaths: 50 },
				{ gameName: 'Dark Souls', deaths: 30 },
			])

			const res = await getDeathsHandler({} as any)

			expect(res.data).toHaveLength(1)
			expect(res.data[0]?.gameName).toBe('Elden Ring')
		})
	})

	describe('POST /api/admin/deaths', () => {
		it('should create a new game death counter', async () => {
			const event = {
				body: { gameName: 'Bloodborne', deaths: 15 },
			} as any

			const res = await postDeathsHandler(event)

			expect(res!.id).toBeDefined()
			expect(res!.gameName).toBe('Bloodborne')
			expect(res!.deaths).toBe(15)

			const record = await db.query.gameDeaths.findFirst({
				where: eq(gameDeaths.gameName, 'Bloodborne'),
			})
			expect(record).toBeDefined()
			expect(record?.deaths).toBe(15)
		})

		it('should update existing game death counter', async () => {
			const created = await db.insert(gameDeaths).values({
				gameName: 'Bloodborne',
				deaths: 15,
			}).returning().then(r => r[0]!)

			const event = {
				body: { id: created.id, gameName: 'Bloodborne', deaths: 20 },
			} as any

			const res = await postDeathsHandler(event)

			expect(res!.deaths).toBe(20)

			const record = await db.query.gameDeaths.findFirst({
				where: eq(gameDeaths.id, created.id),
			})
			expect(record?.deaths).toBe(20)
		})

		it('should reject missing gameName', async () => {
			const event = {
				body: { deaths: 10 },
			} as any

			await expect(async () => {
				await postDeathsHandler(event)
			}).rejects.toThrow()
		})
	})

	describe('DELETE /api/admin/deaths/[id]', () => {
		it('should delete a game death record', async () => {
			const created = await db.insert(gameDeaths).values({
				gameName: 'Hollow Knight',
				deaths: 12,
			}).returning().then(r => r[0]!)

			const event = {
				context: { params: { id: String(created.id) } },
			} as any

			const res = await deleteDeathsHandler(event)

			expect(res.success).toBe(true)

			const record = await db.query.gameDeaths.findFirst({
				where: eq(gameDeaths.id, created.id),
			})
			expect(record).toBeUndefined()
		})
	})
})
