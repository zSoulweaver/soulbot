import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import gamblingGetHandler from '~~/server/api/loyalty/gambling.get'
import gamblingPutHandler from '~~/server/api/loyalty/gambling.put'
import { db } from '~~/server/database'
import { settings } from '~~/server/database/schema'
import { getAppSettingsSync, refreshAppSettingsCache } from '~~/server/utils/settings'
import { clearDatabase } from '../helpers'

describe('Loyalty Gambling Settings API Routes', () => {
	beforeEach(async () => {
		await clearDatabase()
	})

	describe('GET /api/loyalty/gambling', () => {
		it('should return default settings if none are configured in database', async () => {
			const res = await gamblingGetHandler({} as any)
			expect(res).toBeDefined()
			expect(res.minBet).toBe(10)
			expect(res.maxBet).toBe(100000)
			expect(res.winMinRoll).toBe(50)
			expect(res.winMultiplier).toBe(1.0)
		})

		it('should return actual database settings when configured', async () => {
			await db.insert(settings).values([
				{ key: 'points.gambling_min_bet', value: '25', updatedAt: new Date() },
				{ key: 'points.gambling_max_bet', value: '50000', updatedAt: new Date() },
				{ key: 'points.gambling_win_min_roll', value: '45', updatedAt: new Date() },
				{ key: 'points.gambling_win_multiplier', value: '1.5', updatedAt: new Date() },
			])

			await refreshAppSettingsCache()

			const res = await gamblingGetHandler({} as any)
			expect(res.minBet).toBe(25)
			expect(res.maxBet).toBe(50000)
			expect(res.winMinRoll).toBe(45)
			expect(res.winMultiplier).toBe(1.5)
		})
	})

	describe('PUT /api/loyalty/gambling', () => {
		it('should fail with 400 status if validation fails', async () => {
			try {
				await gamblingPutHandler({
					body: {
						minBet: -5,
						maxBet: 1000,
						winMinRoll: 50,
						winMultiplier: 1.0,
					},
				} as any)
				expect.fail('Should have failed')
			}
			catch (err: any) {
				expect(err.statusCode).toBe(400)
			}
		})

		it('should fail if maxBet < minBet', async () => {
			try {
				await gamblingPutHandler({
					body: {
						minBet: 1000,
						maxBet: 500,
						winMinRoll: 50,
						winMultiplier: 1.0,
					},
				} as any)
				expect.fail('Should have failed')
			}
			catch (err: any) {
				expect(err.statusCode).toBe(400)
			}
		})

		it('should save settings and successfully refresh settings cache', async () => {
			const res = await gamblingPutHandler({
				body: {
					minBet: 20,
					maxBet: 80000,
					winMinRoll: 52,
					winMultiplier: 1.2,
				},
			} as any)

			expect(res.success).toBe(true)

			// Assert in database
			const dbMinBet = await db
				.select()
				.from(settings)
				.where(eq(settings.key, 'points.gambling_min_bet'))
				.then(res => res[0])
			expect(dbMinBet?.value).toBe('20')

			// Assert inside synchronous memory cache
			const cached = getAppSettingsSync()
			expect(cached.pointsGamblingMinBet).toBe(20)
			expect(cached.pointsGamblingMaxBet).toBe(80000)
			expect(cached.pointsGamblingWinMinRoll).toBe(52)
			expect(cached.pointsGamblingWinMultiplier).toBe(1.2)
		})
	})
})
