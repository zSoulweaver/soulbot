import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import deleteDeathsHandler from '~~/server/api/admin/deaths/[id].delete'
import getDeathsHandler from '~~/server/api/admin/deaths/index.get'
import postDeathsHandler from '~~/server/api/admin/deaths/index.post'
import searchDeathsHandler from '~~/server/api/admin/deaths/search.get'
import publicDeathsHandler from '~~/server/api/deaths/index.get'
import { db } from '~~/server/database'
import { gameDeaths } from '~~/server/database/schema'
import { clearDatabase } from '../helpers'

describe('Deaths API Endpoints', () => {
	beforeEach(async () => {
		await clearDatabase()
		await db.delete(gameDeaths)
	})

	describe('GET /api/deaths (Public)', () => {
		it('should return ranked deaths list and current game metadata', async () => {
			const mockGetQuery = (globalThis as any).getQuery
			mockGetQuery.mockReturnValueOnce({})

			await db.insert(gameDeaths).values([
				{ gameName: 'Elden Ring', deaths: 50, boxArtUrl: 'https://example.com/elden.jpg' },
				{ gameName: 'Dark Souls', deaths: 30, boxArtUrl: 'https://example.com/souls.jpg' },
				{ gameName: 'Hollow Knight', deaths: 75, boxArtUrl: 'https://example.com/hollow.jpg' },
			])

			const res = await publicDeathsHandler({} as any)

			expect(res.data).toHaveLength(3)
			expect(res.data[0]?.gameName).toBe('Hollow Knight')
			expect(res.data[0]?.rank).toBe(1)
			expect(res.data[1]?.gameName).toBe('Elden Ring')
			expect(res.data[1]?.rank).toBe(2)
			expect(res.data[2]?.gameName).toBe('Dark Souls')
			expect(res.data[2]?.rank).toBe(3)
			expect(res.meta.total).toBe(3)
			expect(res.currentGame).toBeDefined()
		})

		it('should correctly calculate featured game rank without SQLite parameter binding errors', async () => {
			const mockGetQuery = (globalThis as any).getQuery
			mockGetQuery.mockReturnValueOnce({})

			await db.insert(gameDeaths).values([
				{ gameName: 'General', deaths: 25 },
				{ gameName: 'Top Game', deaths: 100 },
			])

			const res = await publicDeathsHandler({} as any)

			expect(res.featuredGame).toBeDefined()
			expect(res.featuredGame?.gameName).toBe('General')
			expect(res.featuredGame?.rank).toBe(2)
		})

		it('should support pagination and search filtering', async () => {
			const mockGetQuery = (globalThis as any).getQuery
			mockGetQuery.mockReturnValueOnce({ search: 'Dark' })

			await db.insert(gameDeaths).values([
				{ gameName: 'Elden Ring', deaths: 50 },
				{ gameName: 'Dark Souls', deaths: 30 },
				{ gameName: 'Dark Souls II', deaths: 40 },
			])

			const res = await publicDeathsHandler({} as any)

			expect(res.data).toHaveLength(2)
			expect(res.data[0]?.gameName).toBe('Dark Souls II')
			expect(res.data[1]?.gameName).toBe('Dark Souls')
			expect(res.meta.total).toBe(2)
		})
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
		it('should create a new game death counter with metadata', async () => {
			const event = {
				body: {
					gameName: 'Bloodborne',
					deaths: 15,
					twitchGameId: '12345',
					boxArtUrl: 'https://example.com/bloodborne.jpg',
				},
			} as any

			const res = await postDeathsHandler(event)

			expect(res!.id).toBeDefined()
			expect(res!.gameName).toBe('Bloodborne')
			expect(res!.deaths).toBe(15)
			expect(res!.twitchGameId).toBe('12345')
			expect(res!.boxArtUrl).toBe('https://example.com/bloodborne.jpg')

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

	describe('GET /api/admin/deaths/search', () => {
		it('should return empty list when query is empty', async () => {
			const mockGetQuery = (globalThis as any).getQuery
			mockGetQuery.mockReturnValueOnce({})

			const res = await searchDeathsHandler({} as any)
			expect(res).toEqual([])
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

	describe('cleanupZeroDeathsRecords', () => {
		it('should remove records with 0 deaths', async () => {
			const { cleanupZeroDeathsRecords } = await import('~~/server/bot/modules/deaths/utils')

			await db.insert(gameDeaths).values([
				{ gameName: 'Zero Death Game', deaths: 0 },
				{ gameName: 'Active Game', deaths: 10 },
			])

			const deletedCount = await cleanupZeroDeathsRecords()
			expect(deletedCount).toBe(1)

			const remaining = await db.select().from(gameDeaths)
			expect(remaining).toHaveLength(1)
			expect(remaining[0]?.gameName).toBe('Active Game')
		})
	})
})
