import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import deleteDeathsHandler from '~~/server/api/admin/deaths/[id].delete'
import setActiveCounterHandler from '~~/server/api/admin/deaths/active.patch'
import postCounterHandler from '~~/server/api/admin/deaths/counter.post'
import deleteCounterHandler from '~~/server/api/admin/deaths/counter/[id].delete'
import getDeathsHandler from '~~/server/api/admin/deaths/index.get'
import postDeathsHandler from '~~/server/api/admin/deaths/index.post'
import publicDeathsHandler from '~~/server/api/deaths/index.get'
import { db } from '~~/server/database'
import { gameDeathCounters, games } from '~~/server/database/schema'
import { clearDatabase } from '../helpers'

describe('Deaths API Endpoints', () => {
	beforeEach(async () => {
		await clearDatabase()
		await db.delete(gameDeathCounters)
		await db.delete(games)
	})

	describe('GET /api/deaths (Public)', () => {
		it('should return ranked deaths list and current game metadata with sub-counters', async () => {
			const mockGetQuery = (globalThis as any).getQuery
			mockGetQuery.mockReturnValueOnce({})

			const [elden] = await db.insert(games).values({
				name: 'Elden Ring',
				boxArtUrl: 'https://example.com/elden.jpg',
			}).returning()
			await db.insert(gameDeathCounters).values([
				{ gameId: elden!.id, name: 'Default', deaths: 30 },
				{ gameId: elden!.id, name: 'DLC', deaths: 20 },
			])

			const [souls] = await db.insert(games).values({
				name: 'Dark Souls',
				boxArtUrl: 'https://example.com/souls.jpg',
			}).returning()
			await db.insert(gameDeathCounters).values({
				gameId: souls!.id,
				name: 'Default',
				deaths: 30,
			})

			const [hollow] = await db.insert(games).values({
				name: 'Hollow Knight',
				boxArtUrl: 'https://example.com/hollow.jpg',
			}).returning()
			await db.insert(gameDeathCounters).values({
				gameId: hollow!.id,
				name: 'Default',
				deaths: 75,
			})

			const res = await publicDeathsHandler({} as any)

			expect(res.data).toHaveLength(3)
			expect(res.data[0]?.gameName).toBe('Hollow Knight')
			expect(res.data[0]?.rank).toBe(1)
			expect(res.data[0]?.deaths).toBe(75)

			expect(res.data[1]?.gameName).toBe('Elden Ring')
			expect(res.data[1]?.rank).toBe(2)
			expect(res.data[1]?.deaths).toBe(50) // 30 + 20
			expect(res.data[1]?.counters).toHaveLength(2)

			expect(res.data[2]?.gameName).toBe('Dark Souls')
			expect(res.data[2]?.rank).toBe(3)
			expect(res.data[2]?.deaths).toBe(30)
			expect(res.meta.total).toBe(3)
			expect(res.currentGame).toBeDefined()
		})

		it('should correctly calculate featured game rank and active counter stats', async () => {
			const mockGetQuery = (globalThis as any).getQuery
			mockGetQuery.mockReturnValueOnce({})

			const [top] = await db.insert(games).values({ name: 'Top Game' }).returning()
			await db.insert(gameDeathCounters).values({ gameId: top!.id, name: 'Default', deaths: 100 })

			const [gen] = await db.insert(games).values({ name: 'General' }).returning()
			const [dlc] = await db.insert(gameDeathCounters).values({ gameId: gen!.id, name: 'DLC Run', deaths: 25 }).returning()
			await db.update(games).set({ activeDeathCounterId: dlc!.id }).where(eq(games.id, gen!.id))

			const res = await publicDeathsHandler({} as any)

			expect(res.featuredGame).toBeDefined()
			expect(res.featuredGame?.gameName).toBe('General')
			expect(res.featuredGame?.rank).toBe(2)
			expect(res.featuredGame?.activeCounterName).toBe('DLC Run')
			expect(res.featuredGame?.activeCounterDeaths).toBe(25)
		})

		it('should support pagination and search filtering', async () => {
			const mockGetQuery = (globalThis as any).getQuery
			mockGetQuery.mockReturnValueOnce({ search: 'Dark' })

			const [elden] = await db.insert(games).values({ name: 'Elden Ring' }).returning()
			await db.insert(gameDeathCounters).values({ gameId: elden!.id, name: 'Default', deaths: 50 })

			const [souls] = await db.insert(games).values({ name: 'Dark Souls' }).returning()
			await db.insert(gameDeathCounters).values({ gameId: souls!.id, name: 'Default', deaths: 30 })

			const [souls2] = await db.insert(games).values({ name: 'Dark Souls II' }).returning()
			await db.insert(gameDeathCounters).values({ gameId: souls2!.id, name: 'Default', deaths: 40 })

			const res = await publicDeathsHandler({} as any)

			expect(res.data).toHaveLength(2)
			expect(res.data[0]?.gameName).toBe('Dark Souls II')
			expect(res.data[1]?.gameName).toBe('Dark Souls')
			expect(res.meta.total).toBe(2)
		})
	})

	describe('GET /api/admin/deaths', () => {
		it('should list game death records with sub-counters paginated', async () => {
			const mockGetQuery = (globalThis as any).getQuery
			mockGetQuery.mockReturnValueOnce({ page: '1', limit: '10' })

			const [elden] = await db.insert(games).values({ name: 'Elden Ring' }).returning()
			await db.insert(gameDeathCounters).values({ gameId: elden!.id, name: 'Default', deaths: 50 })

			const [souls] = await db.insert(games).values({ name: 'Dark Souls' }).returning()
			await db.insert(gameDeathCounters).values({ gameId: souls!.id, name: 'Default', deaths: 30 })

			const res = await getDeathsHandler({} as any)

			expect(res.data).toHaveLength(2)
			expect(res.meta.total).toBe(2)
			expect(res.data[0]?.counters).toBeDefined()
			expect(res.currentGame).toBeDefined()
		})
	})

	describe('POST /api/admin/deaths', () => {
		it('should create a new game death counter with metadata', async () => {
			const event = {
				body: {
					gameName: 'Bloodborne',
					counterName: 'Default',
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

			const record = await db.query.games.findFirst({
				where: eq(games.name, 'Bloodborne'),
			})
			expect(record).toBeDefined()
		})

		it('should save multiple counters in batch and update active counter', async () => {
			const [game] = await db.insert(games).values({ name: 'Hollow Knight' }).returning()
			const [c1] = await db.insert(gameDeathCounters).values({ gameId: game!.id, name: 'Default', deaths: 20 }).returning()

			const event = {
				body: {
					gameName: 'Hollow Knight',
					counters: [
						{ id: c1!.id, name: 'Main Game', deaths: 25, isActive: false },
						{ name: 'Steel Soul', deaths: 5, isActive: true },
					],
				},
			} as any

			const res = await postDeathsHandler(event)
			expect(res!.gameName).toBe('Hollow Knight')
			expect(res!.totalDeaths).toBe(30)
			expect(res!.counterName).toBe('Steel Soul')
			expect(res!.deaths).toBe(5)

			const dbCounters = await db.select().from(gameDeathCounters).where(eq(gameDeathCounters.gameId, game!.id))
			expect(dbCounters).toHaveLength(2)
		})
	})

	describe('POST /api/admin/deaths/counter & DELETE /api/admin/deaths/counter/[id]', () => {
		it('should create and delete individual playthrough counters', async () => {
			const [game] = await db.insert(games).values({ name: 'Elden Ring' }).returning()

			const createRes = await postCounterHandler({
				body: {
					gameId: game!.id,
					name: 'Shadow of the Erdtree',
					deaths: 12,
					setActive: true,
				},
			} as any)

			expect(createRes.counter.name).toBe('Shadow of the Erdtree')
			expect(createRes.counter.deaths).toBe(12)

			const gameCheck = await db.query.games.findFirst({ where: eq(games.id, game!.id) })
			expect(gameCheck?.activeDeathCounterId).toBe(createRes.counter.id)

			// Delete counter
			const deleteRes = await deleteCounterHandler({
				context: { params: { id: String(createRes.counter.id) } },
			} as any)
			expect(deleteRes.success).toBe(true)
		})
	})

	describe('PATCH /api/admin/deaths/active', () => {
		it('should switch active counter for a game', async () => {
			const [game] = await db.insert(games).values({ name: 'Elden Ring' }).returning()
			const [_c1] = await db.insert(gameDeathCounters).values({ gameId: game!.id, name: 'Default', deaths: 5 }).returning()
			const [c2] = await db.insert(gameDeathCounters).values({ gameId: game!.id, name: 'NG+', deaths: 10 }).returning()

			const res = await setActiveCounterHandler({
				body: { gameId: game!.id, counterId: c2!.id },
			} as any)

			expect(res.activeCounter.id).toBe(c2!.id)
			expect(res.activeCounter.name).toBe('NG+')
		})
	})

	describe('DELETE /api/admin/deaths/[id]', () => {
		it('should delete a game and all its sub-counters', async () => {
			const [created] = await db.insert(games).values({
				name: 'Hollow Knight',
			}).returning()
			await db.insert(gameDeathCounters).values({
				gameId: created!.id,
				name: 'Default',
				deaths: 12,
			})

			const event = {
				context: { params: { id: String(created!.id) } },
			} as any

			const res = await deleteDeathsHandler(event)

			expect(res.success).toBe(true)

			const record = await db.query.games.findFirst({
				where: eq(games.id, created!.id),
			})
			expect(record).toBeUndefined()

			const counters = await db.query.gameDeathCounters.findMany({
				where: eq(gameDeathCounters.gameId, created!.id),
			})
			expect(counters).toHaveLength(0)
		})
	})
})
