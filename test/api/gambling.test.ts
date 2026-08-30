import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import gamblingGetHandler from '~~/server/api/loyalty/gambling.get'
import gamblingPutHandler from '~~/server/api/loyalty/gambling.put'
import cancelBonusHandler from '~~/server/api/loyalty/gambling/bonus/cancel.post'
import triggerBonusHandler from '~~/server/api/loyalty/gambling/bonus/trigger.post'
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
			expect(res.bonusDuration).toBe(5)
			expect(res.bonusWinMultiplier).toBe(2.0)
			expect(res.bonusWinMinRoll).toBe(50)
			expect(res.bonusTicketsPerUser).toBe(5)
			expect(res.bonusMessage).toContain('A limited-time gambling bonus event is now active!')
			expect(res.bonusEndMessage).toContain('The limited-time gambling bonus event has ended!')
			expect(res.bonusEndTime).toBe(0)
		})

		it('should return actual database settings when configured', async () => {
			await db.insert(settings).values([
				{ key: 'points.gambling_min_bet', value: '25', updatedAt: new Date() },
				{ key: 'points.gambling_max_bet', value: '50000', updatedAt: new Date() },
				{ key: 'points.gambling_win_min_roll', value: '45', updatedAt: new Date() },
				{ key: 'points.gambling_win_multiplier', value: '1.5', updatedAt: new Date() },
				{ key: 'points.gambling_bonus_duration', value: '8', updatedAt: new Date() },
				{ key: 'points.gambling_bonus_win_multiplier', value: '2.5', updatedAt: new Date() },
				{ key: 'points.gambling_bonus_win_min_roll', value: '60', updatedAt: new Date() },
				{ key: 'points.gambling_bonus_tickets_per_user', value: '7', updatedAt: new Date() },
				{ key: 'points.gambling_bonus_message', value: 'Custom start message', updatedAt: new Date() },
				{ key: 'points.gambling_bonus_end_message', value: 'Custom end message', updatedAt: new Date() },
				{ key: 'points.gambling_bonus_end_time', value: '0', updatedAt: new Date() },
			])

			await refreshAppSettingsCache()

			const res = await gamblingGetHandler({} as any)
			expect(res.minBet).toBe(25)
			expect(res.maxBet).toBe(50000)
			expect(res.winMinRoll).toBe(45)
			expect(res.winMultiplier).toBe(1.5)
			expect(res.bonusDuration).toBe(8)
			expect(res.bonusWinMultiplier).toBe(2.5)
			expect(res.bonusWinMinRoll).toBe(60)
			expect(res.bonusTicketsPerUser).toBe(7)
			expect(res.bonusMessage).toBe('Custom start message')
			expect(res.bonusEndMessage).toBe('Custom end message')
			expect(res.bonusEndTime).toBe(0)
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
						bonusDuration: 5,
						bonusWinMultiplier: 2.0,
						bonusWinMinRoll: 50,
						bonusTicketsPerUser: 5,
						bonusMessage: 'Start',
						bonusEndMessage: 'End',
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
						bonusDuration: 5,
						bonusWinMultiplier: 2.0,
						bonusWinMinRoll: 50,
						bonusTicketsPerUser: 5,
						bonusMessage: 'Start',
						bonusEndMessage: 'End',
					},
				} as any)
				expect.fail('Should have failed')
			}
			catch (err: any) {
				expect(err.statusCode).toBe(400)
			}
		})

		it('should fail if bonusTicketsPerUser < 1', async () => {
			try {
				await gamblingPutHandler({
					body: {
						minBet: 10,
						maxBet: 1000,
						winMinRoll: 50,
						winMultiplier: 1.0,
						bonusDuration: 5,
						bonusWinMultiplier: 2.0,
						bonusWinMinRoll: 50,
						bonusTicketsPerUser: 0,
						bonusMessage: 'Start',
						bonusEndMessage: 'End',
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
					bonusDuration: 12,
					bonusWinMultiplier: 2.4,
					bonusWinMinRoll: 55,
					bonusTicketsPerUser: 8,
					bonusMessage: 'New Start Message',
					bonusEndMessage: 'New End Message',
				},
			} as any)

			expect(res.success).toBe(true)

			// Assert in database
			const dbMinBet = await db
				.select()
				.from(settings)
				.where(eq(settings.key, 'points.gambling.min_bet'))
				.then(res => res[0])
			expect(dbMinBet?.value).toBe('20')

			const dbTickets = await db
				.select()
				.from(settings)
				.where(eq(settings.key, 'points.gambling.bonus_tickets_per_user'))
				.then(res => res[0])
			expect(dbTickets?.value).toBe('8')

			// Assert inside synchronous memory cache
			const cached = getAppSettingsSync()
			expect(cached.pointsGamblingMinBet).toBe(20)
			expect(cached.pointsGamblingMaxBet).toBe(80000)
			expect(cached.pointsGamblingWinMinRoll).toBe(52)
			expect(cached.pointsGamblingWinMultiplier).toBe(1.2)
			expect(cached.pointsGamblingBonusDuration).toBe(12)
			expect(cached.pointsGamblingBonusWinMultiplier).toBe(2.4)
			expect(cached.pointsGamblingBonusWinMinRoll).toBe(55)
			expect(cached.pointsGamblingBonusTicketsPerUser).toBe(8)
			expect(cached.pointsGamblingBonusMessage).toBe('New Start Message')
			expect(cached.pointsGamblingBonusEndMessage).toBe('New End Message')
		})
	})

	describe('POST /api/loyalty/gambling/bonus/trigger & /cancel', () => {
		it('should trigger and cancel bonus event successfully', async () => {
			// Trigger
			const triggerRes = await triggerBonusHandler({} as any)
			expect(triggerRes.success).toBe(true)
			expect(triggerRes.endTime).toBeGreaterThan(Date.now())

			const activeCached = getAppSettingsSync()
			expect(activeCached.pointsGamblingBonusEndTime).toBe(triggerRes.endTime)

			// Trigger again should fail (collision prevention)
			try {
				await triggerBonusHandler({} as any)
				expect.fail('Should not be able to trigger active event')
			}
			catch (err: any) {
				expect(err.statusCode).toBe(400)
				expect(err.statusMessage).toBe('A gambling bonus event is already active.')
			}

			// Cancel
			const cancelRes = await cancelBonusHandler({} as any)
			expect(cancelRes.success).toBe(true)

			const inactiveCached = getAppSettingsSync()
			expect(inactiveCached.pointsGamblingBonusEndTime).toBe(0)
		})
	})
})
