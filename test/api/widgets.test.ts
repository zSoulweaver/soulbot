import { beforeEach, describe, expect, it } from 'vitest'
import getAdminWidgetHandler from '~~/server/api/admin/widgets/[id].get'
import putAdminWidgetHandler from '~~/server/api/admin/widgets/[id].put'
import getKeyHandler from '~~/server/api/admin/widgets/key.get'
import postKeyHandler from '~~/server/api/admin/widgets/key.post'
import getPublicDeathsWidgetHandler from '~~/server/api/widgets/deaths.get'
import { db } from '~~/server/database'
import { gameDeaths, settings, widgets } from '~~/server/database/schema'
import { getWidgetSecretKey } from '~~/server/utils/widgets'
import { clearDatabase } from '../helpers'

describe('OBS Widgets API Endpoints', () => {
	beforeEach(async () => {
		await clearDatabase()
		await db.delete(widgets)
		await db.delete(settings)
		await db.delete(gameDeaths)
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

			const current = await getWidgetSecretKey()
			expect(current).toBe(res.key)
		})
	})

	describe('Admin Widget Configuration', () => {
		it('gET /api/admin/widgets/[id] returns default death counter config', async () => {
			const mockGetRouterParam = (globalThis as any).getRouterParam
			mockGetRouterParam.mockReturnValueOnce('deaths')

			const res = await getAdminWidgetHandler({} as any)

			expect(res.widget).toBeDefined()
			expect(res.widget!.id).toBe('deaths')
			expect(res.widget!.template).toContain('{count}')
			expect(res.key).toBeDefined()
		})

		it('pUT /api/admin/widgets/[id] updates template and custom styles', async () => {
			const mockGetRouterParam = (globalThis as any).getRouterParam
			mockGetRouterParam.mockReturnValueOnce('deaths')

			const event = {
				body: {
					template: 'Deaths Count: {count} in {game}',
					styles: {
						color: '#ff0000',
						fontSize: 48,
					},
				},
			} as any

			const res = await putAdminWidgetHandler(event)

			expect(res!.template).toBe('Deaths Count: {count} in {game}')
			expect(res!.styles.color).toBe('#ff0000')
			expect(res!.styles.fontSize).toBe(48)
		})
	})

	describe('Public OBS Widget Endpoint', () => {
		it('rejects public request when key query parameter is missing', async () => {
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
			await db.insert(gameDeaths).values({
				gameName: 'General',
				deaths: 42,
			})

			const mockGetQuery = (globalThis as any).getQuery
			mockGetQuery.mockReturnValueOnce({ key: validKey })

			const res = await getPublicDeathsWidgetHandler({} as any)

			expect(res.gameName).toBe('General')
			expect(res.deaths).toBe(42)
			expect(res.formattedText).toBe('General Deaths: 42')
			expect(res.styles).toBeDefined()
		})
	})
})
