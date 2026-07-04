import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import alertsGetHandler from '~~/server/api/admin/alerts/settings.get'
import alertsPutHandler from '~~/server/api/admin/alerts/settings.put'
import { db } from '~~/server/database'
import { settings } from '~~/server/database/schema'
import { getAppSettingsSync, refreshAppSettingsCache } from '~~/server/utils/settings'
import { clearDatabase } from '../helpers'

describe('Alerts & EventSub Settings API Routes', () => {
	beforeEach(async () => {
		await clearDatabase()
	})

	describe('GET /api/admin/alerts/settings', () => {
		it('should return disabled-by-default settings with default alert templates initially', async () => {
			const res = await alertsGetHandler({} as any)
			expect(res).toBeDefined()
			expect(res.eventsubAlertFollowEnabled).toBe(false)
			expect(res.eventsubAlertSubEnabled).toBe(false)
			expect(res.eventsubAlertGiftEnabled).toBe(false)
			expect(res.eventsubAlertCheerEnabled).toBe(false)
			expect(res.eventsubPointsFollowEnabled).toBe(false)
			expect(res.eventsubPointsSubEnabled).toBe(false)
			expect(res.eventsubPointsGiftEnabled).toBe(false)
			expect(res.eventsubPointsCheerEnabled).toBe(false)
			expect(res.eventsubAlertFollow).toBe('Thank you for the follow, $(sender)!')
			expect(res.eventsubPointsFollow).toBe(100)
			expect(res.eventsubPointsSub).toBe(500)
		})

		it('should retrieve custom configurations from the database correctly', async () => {
			await db.insert(settings).values([
				{ key: 'eventsub.alert.follow.enabled', value: 'true', updatedAt: new Date() },
				{ key: 'eventsub.alert.follow', value: 'Hello $(sender)!', updatedAt: new Date() },
				{ key: 'eventsub.points.follow.enabled', value: 'true', updatedAt: new Date() },
				{ key: 'eventsub.points.follow', value: '250', updatedAt: new Date() },
			])
			await refreshAppSettingsCache()

			const res = await alertsGetHandler({} as any)
			expect(res.eventsubAlertFollowEnabled).toBe(true)
			expect(res.eventsubAlertFollow).toBe('Hello $(sender)!')
			expect(res.eventsubPointsFollowEnabled).toBe(true)
			expect(res.eventsubPointsFollow).toBe(250)
		})
	})

	describe('PUT /api/admin/alerts/settings', () => {
		it('should fail validation with negative points or invalid types', async () => {
			try {
				await alertsPutHandler({
					body: {
						eventsubAlertFollowEnabled: true,
						eventsubAlertSubEnabled: false,
						eventsubAlertGiftEnabled: false,
						eventsubAlertCheerEnabled: false,
						eventsubPointsFollowEnabled: true,
						eventsubPointsSubEnabled: false,
						eventsubPointsGiftEnabled: false,
						eventsubPointsCheerEnabled: false,
						eventsubAlertFollow: 'Follow!',
						eventsubAlertSub: 'Sub!',
						eventsubAlertGift: 'Gift!',
						eventsubAlertCheer: 'Cheer!',
						eventsubPointsFollow: -100, // Invalid: negative points
						eventsubPointsSub: 500,
						eventsubPointsGift: 500,
						eventsubPointsCheer: 1,
						eventsubAlertAdBreakEnabled: false,
						eventsubAlertAdBreak: 'Ad break alert!',
					},
				} as any)
				expect.fail('Validation should have blocked negative points')
			}
			catch (err: any) {
				expect(err.statusCode).toBe(400)
				expect(err.statusMessage).toContain('Invalid EventSub settings data')
			}
		})

		it('should save settings and successfully reload setting memory cache', async () => {
			const res = await alertsPutHandler({
				body: {
					eventsubAlertFollowEnabled: true,
					eventsubAlertSubEnabled: true,
					eventsubAlertGiftEnabled: false,
					eventsubAlertCheerEnabled: false,
					eventsubPointsFollowEnabled: true,
					eventsubPointsSubEnabled: true,
					eventsubPointsGiftEnabled: false,
					eventsubPointsCheerEnabled: false,
					eventsubAlertFollow: 'Custom follow alert text',
					eventsubAlertSub: 'Custom sub alert text',
					eventsubAlertGift: 'Gift sub alert',
					eventsubAlertCheer: 'Bits cheer alert',
					eventsubPointsFollow: 400,
					eventsubPointsSub: 1000,
					eventsubPointsGift: 500,
					eventsubPointsCheer: 2,
					eventsubAlertAdBreakEnabled: false,
					eventsubAlertAdBreak: 'Ad break alert!',
				},
			} as any)

			expect(res.success).toBe(true)

			// Assert in database directly
			const dbFollowPoints = await db
				.select()
				.from(settings)
				.where(eq(settings.key, 'eventsub.points.follow'))
				.then(res => res[0])
			expect(dbFollowPoints?.value).toBe('400')

			// Assert inside synchronous memory cache
			const cached = getAppSettingsSync()
			expect(cached.eventsubAlertFollowEnabled).toBe(true)
			expect(cached.eventsubAlertFollow).toBe('Custom follow alert text')
			expect(cached.eventsubPointsFollow).toBe(400)
			expect(cached.eventsubPointsSub).toBe(1000)
			expect(cached.eventsubAlertAdBreakEnabled).toBe(false)
			expect(cached.eventsubAlertAdBreak).toBe('Ad break alert!')
		})
	})
})
