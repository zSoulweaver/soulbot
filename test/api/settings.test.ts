import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import settingsGetHandler from '~~/server/api/loyalty/settings.get'
import settingsPutHandler from '~~/server/api/loyalty/settings.put'
import { db } from '~~/server/database'
import { settings } from '~~/server/database/schema'
import { getAppSettingsSync, refreshAppSettingsCache } from '~~/server/utils/settings'
import { clearDatabase } from '../helpers'

describe('Loyalty Settings API Routes', () => {
	beforeEach(async () => {
		await clearDatabase()
	})

	describe('GET /api/loyalty/settings', () => {
		it('should return default settings if none are configured in database', async () => {
			const res = await settingsGetHandler({} as any)
			expect(res).toBeDefined()
			expect(res.currencyName).toBe('point')
			expect(res.currencyNamePlural).toBe('points')
			expect(res.payoutInterval).toBe(5)
			expect(res.payoutIntervalOffline).toBe(10)
			expect(res.payoutAmount).toBe(5)
			expect(res.payoutAmountOffline).toBe(0)
			expect(res.activeBonus).toBe(5)
		})

		it('should return actual database settings when configured', async () => {
			await db.insert(settings).values([
				{ key: 'points.currency_name', value: 'token', updatedAt: new Date() },
				{ key: 'points.currency_name_plural', value: 'tokens', updatedAt: new Date() },
				{ key: 'points.payout_interval', value: '8', updatedAt: new Date() },
				{ key: 'points.payout_interval_offline', value: '20', updatedAt: new Date() },
				{ key: 'points.payout_amount', value: '15', updatedAt: new Date() },
				{ key: 'points.payout_amount_offline', value: '3', updatedAt: new Date() },
				{ key: 'points.active_bonus', value: '10', updatedAt: new Date() },
			])

			await refreshAppSettingsCache()

			const res = await settingsGetHandler({} as any)
			expect(res.currencyName).toBe('token')
			expect(res.currencyNamePlural).toBe('tokens')
			expect(res.payoutInterval).toBe(8)
			expect(res.payoutIntervalOffline).toBe(20)
			expect(res.payoutAmount).toBe(15)
			expect(res.payoutAmountOffline).toBe(3)
			expect(res.activeBonus).toBe(10)
		})
	})

	describe('PUT /api/loyalty/settings', () => {
		it('should fail with 400 status if validation fails', async () => {
			try {
				await settingsPutHandler({
					body: {
						currencyName: '',
						currencyNamePlural: 'tokens',
						payoutInterval: -5,
						payoutIntervalOffline: 10,
						payoutAmount: 5,
						payoutAmountOffline: 0,
						activeBonus: 5,
					},
				} as any)
				expect.fail('Should have failed')
			}
			catch (err: any) {
				expect(err.statusCode).toBe(400)
			}
		})

		it('should save settings and successfully refresh settings cache', async () => {
			const res = await settingsPutHandler({
				body: {
					currencyName: 'gil',
					currencyNamePlural: 'gils',
					payoutInterval: 15,
					payoutIntervalOffline: 30,
					payoutAmount: 20,
					payoutAmountOffline: 5,
					activeBonus: 10,
				},
			} as any)

			expect(res.success).toBe(true)

			// Assert in database
			const dbGil = await db
				.select()
				.from(settings)
				.where(eq(settings.key, 'points.currency_name'))
				.then(res => res[0])
			expect(dbGil?.value).toBe('gil')

			// Assert inside synchronous memory cache
			const cached = getAppSettingsSync()
			expect(cached.currencyName).toBe('gil')
			expect(cached.currencyNamePlural).toBe('gils')
			expect(cached.payoutInterval).toBe(15)
			expect(cached.payoutIntervalOffline).toBe(30)
			expect(cached.payoutAmount).toBe(20)
			expect(cached.payoutAmountOffline).toBe(5)
			expect(cached.activeBonus).toBe(10)
		})
	})
})
