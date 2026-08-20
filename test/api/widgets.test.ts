import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import getAdminWidgetHandler from '~~/server/api/admin/widgets/[id].get'
import putAdminWidgetHandler from '~~/server/api/admin/widgets/[id].put'
import getKeyHandler from '~~/server/api/admin/widgets/key.get'
import postKeyHandler from '~~/server/api/admin/widgets/key.post'
import getPublicDeathsWidgetHandler from '~~/server/api/widgets/deaths.get'
import { db } from '~~/server/database'
import { gameDeathCounters, games, settings, twitchTokens, widgets } from '~~/server/database/schema'
import { getStreamerToken } from '~~/server/utils/twurple'
import { getWidgetConfig, getWidgetSecretKey } from '~~/server/utils/widgets'
import { clearDatabase } from '../helpers'
import { mockApiClient } from '../setup'

describe('OBS Widgets API Endpoints', () => {
	beforeEach(async () => {
		await clearDatabase()
		await db.delete(widgets)
		await db.delete(settings)
		await db.delete(gameDeathCounters)
		await db.delete(games)
		await db.delete(twitchTokens)

		await db.insert(twitchTokens).values({
			accountType: 'streamer',
			userId: 'streamer-id-123',
			userName: 'streamerchannel',
			displayName: 'StreamerChannel',
			accessToken: 'access',
			refreshToken: 'refresh',
			scope: '[]',
			obtainmentTimestamp: Date.now(),
		})

		await getStreamerToken(true)
	})

	describe('Secret Key Management', () => {
		it('gET /api/admin/widgets/key returns or generates a valid secret key', async () => {
			const res = await getKeyHandler({} as any)
			expect(res.key).toBeDefined()
			expect(typeof res.key).toBe('string')
			expect(res.key.length).toBeGreaterThan(10)
		})

		it('pOST /api/admin/widgets/key regenerates and updates secret key', async () => {
			const initial = await getWidgetSecretKey()
			const res = await postKeyHandler({} as any)
			expect(res.key).toBeDefined()
			expect(res.key).not.toBe(initial)
		})
	})

	describe('Widget Configuration Management', () => {
		it('gET /api/admin/widgets/:id returns default death counter widget configuration', async () => {
			const event = {
				context: { params: { id: 'deaths' } },
			} as any

			const res = await getAdminWidgetHandler(event)

			expect(res.widget).toBeDefined()
			expect(res.widget.id).toBe('deaths')
			expect(res.widget.template).toBe('$(game) Deaths: $(count)')
			expect(res.widget.styles).toBeDefined()
			expect(res.key).toBeDefined()
		})

		it('pUT /api/admin/widgets/:id updates widget template and styles', async () => {
			const mockGetRouterParam = (globalThis as any).getRouterParam
			mockGetRouterParam.mockReturnValueOnce('deaths')

			const event = {
				context: { params: { id: 'deaths' } },
				body: {
					template: '💀 Deaths: $(count)',
					styles: {
						fontSize: 48,
						color: '#ff0000',
					},
				},
			} as any

			const res = await putAdminWidgetHandler(event)

			expect(res.template).toBe('💀 Deaths: $(count)')
			expect(res.styles.fontSize).toBe(48)
			expect(res.styles.color).toBe('#ff0000')
		})
	})

	describe('Public Overlay Widget Endpoint', () => {
		it('rejects public request when secret key is missing', async () => {
			const mockGetQuery = (globalThis as any).getQuery
			mockGetQuery.mockReturnValueOnce({})

			await expect(async () => {
				await getPublicDeathsWidgetHandler({} as any)
			}).rejects.toThrow('Missing widget secret key')
		})

		it('rejects public request when key query parameter is invalid', async () => {
			await getWidgetSecretKey() // populate valid key in db
			const mockGetQuery = (globalThis as any).getQuery
			mockGetQuery.mockReturnValueOnce({ key: 'invalid-key-123' })

			await expect(async () => {
				await getPublicDeathsWidgetHandler({} as any)
			}).rejects.toThrow('Invalid widget secret key')
		})

		it('returns formatted widget output when valid key is provided', async () => {
			const validKey = await getWidgetSecretKey()
			const [game] = await db.insert(games).values({
				name: 'General',
			}).returning()
			const [counter] = await db.insert(gameDeathCounters).values({
				gameId: game!.id,
				name: 'Default',
				deaths: 42,
			}).returning()
			await db.update(games).set({ activeDeathCounterId: counter!.id }).where(eq(games.id, game!.id))

			const mockGetQuery = (globalThis as any).getQuery
			mockGetQuery.mockReturnValueOnce({ key: validKey })

			const res = await getPublicDeathsWidgetHandler({} as any)

			expect(res.gameName).toBe('General')
			expect(res.deaths).toBe(42)
			expect(res.formattedText).toBe('General Deaths: 42')
			expect(res.styles).toBeDefined()
		})

		it('formats active counter name in brackets when non-default and showActiveCounter is enabled', async () => {
			;(mockApiClient as any).streams = {
				getStreamByUserId: vi.fn(async () => ({
					gameName: 'Elden Ring',
				})),
			}

			const validKey = await getWidgetSecretKey()
			const [game] = await db.insert(games).values({
				name: 'Elden Ring',
			}).returning()
			const [counter] = await db.insert(gameDeathCounters).values({
				gameId: game!.id,
				name: 'DLC',
				deaths: 15,
			}).returning()
			await db.update(games).set({ activeDeathCounterId: counter!.id }).where(eq(games.id, game!.id))

			const mockGetQuery = (globalThis as any).getQuery
			mockGetQuery.mockReturnValueOnce({ key: validKey })

			const res = await getPublicDeathsWidgetHandler({} as any)

			expect(res.gameName).toBe('Elden Ring')
			expect(res.counterName).toBe('DLC')
			expect(res.deaths).toBe(15)
			expect(res.formattedText).toBe('Elden Ring [DLC] Deaths: 15')
		})

		it('replaces explicit $(counter) variable in template', async () => {
			;(mockApiClient as any).streams = {
				getStreamByUserId: vi.fn(async () => ({
					gameName: 'Ghost of Tsushima',
				})),
			}

			const validKey = await getWidgetSecretKey()
			const [game] = await db.insert(games).values({
				name: 'Ghost of Tsushima',
			}).returning()
			const [counter] = await db.insert(gameDeathCounters).values({
				gameId: game!.id,
				name: 'Lethal+',
				deaths: 7,
			}).returning()
			await db.update(games).set({ activeDeathCounterId: counter!.id }).where(eq(games.id, game!.id))

			await getWidgetConfig('deaths')
			await db.update(widgets).set({
				template: '$(game) ($(counter)): $(count) deaths',
			}).where(eq(widgets.id, 'deaths'))

			const mockGetQuery = (globalThis as any).getQuery
			mockGetQuery.mockReturnValueOnce({ key: validKey })

			const res = await getPublicDeathsWidgetHandler({} as any)

			expect(res.formattedText).toBe('Ghost of Tsushima (Lethal+): 7 deaths')
		})
	})
})
