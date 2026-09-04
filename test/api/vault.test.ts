import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import vaultGetHandler from '~~/server/api/loyalty/vault.get'
import vaultPutHandler from '~~/server/api/loyalty/vault.put'
import cancelVaultHandler from '~~/server/api/loyalty/vault/cancel.post'
import triggerVaultHandler from '~~/server/api/loyalty/vault/trigger.post'
import { templateRegistry } from '~~/server/bot/core/templates'
import { clearVaultTimers } from '~~/server/bot/modules/points/vault-manager'
import { db } from '~~/server/database'
import { settings } from '~~/server/database/schema'
import { getAppSettingsSync, refreshAppSettingsCache } from '~~/server/utils/settings'
import { clearDatabase } from '../helpers'

describe('Loyalty Vault Settings API Routes', () => {
	beforeEach(async () => {
		await clearDatabase()
		clearVaultTimers()
	})

	describe('GET /api/loyalty/vault', () => {
		it('should return default settings if none are configured in database', async () => {
			const res = await vaultGetHandler({} as any)
			expect(res).toBeDefined()
			expect(res.minBet).toBe(10)
			expect(res.maxBet).toBe(100000)
			expect(res.winMinRoll).toBe(50)
			expect(res.winMultiplier).toBe(2.0)
			expect(res.duration).toBe(90)
			expect(res.warningEnabled).toBe(true)
			expect(res.endTime).toBe(0)
			expect(res.startMessage).toContain('VAULT RAID INITIATED')
			expect(res.warningMessage).toContain('15 seconds remaining')
			expect(res.endWinMessage).toContain('THE VAULT WAS CRACKED')
			expect(res.endLoseMessage).toContain('THE VAULT DEFENSES HELD')
		})

		it('should return actual database settings when configured', async () => {
			await db.insert(settings).values([
				{ key: 'points.vault_min_bet', value: '20', updatedAt: new Date() },
				{ key: 'points.vault_max_bet', value: '50000', updatedAt: new Date() },
				{ key: 'points.vault_win_min_roll', value: '45', updatedAt: new Date() },
				{ key: 'points.vault_win_multiplier', value: '1.5', updatedAt: new Date() },
				{ key: 'points.vault_duration', value: '60', updatedAt: new Date() },
				{ key: 'points.vault_warning_enabled', value: 'false', updatedAt: new Date() },
				{ key: 'points.vault_end_time', value: '0', updatedAt: new Date() },
			])
			await templateRegistry.update('vault.start', 'Custom start')
			await templateRegistry.update('vault.warning', 'Custom warning')
			await templateRegistry.update('vault.win', 'Custom win')
			await templateRegistry.update('vault.lose', 'Custom lose')

			await refreshAppSettingsCache()

			const res = await vaultGetHandler({} as any)
			expect(res.minBet).toBe(20)
			expect(res.maxBet).toBe(50000)
			expect(res.winMinRoll).toBe(45)
			expect(res.winMultiplier).toBe(1.5)
			expect(res.duration).toBe(60)
			expect(res.warningEnabled).toBe(false)
			expect(res.startMessage).toBe('Custom start')
			expect(res.warningMessage).toBe('Custom warning')
			expect(res.endWinMessage).toBe('Custom win')
			expect(res.endLoseMessage).toBe('Custom lose')
			expect(res.endTime).toBe(0)
		})
	})

	describe('PUT /api/loyalty/vault', () => {
		it('should fail with 400 status if validation fails', async () => {
			try {
				await vaultPutHandler({
					body: {
						minBet: -5,
						maxBet: 1000,
						winMinRoll: 50,
						winMultiplier: 1.0,
						duration: 90,
						warningEnabled: true,
						startMessage: 'Start',
						warningMessage: 'Warning',
						endWinMessage: 'Win',
						endLoseMessage: 'Lose',
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
				await vaultPutHandler({
					body: {
						minBet: 1000,
						maxBet: 500,
						winMinRoll: 50,
						winMultiplier: 1.0,
						duration: 90,
						warningEnabled: true,
						startMessage: 'Start',
						warningMessage: 'Warning',
						endWinMessage: 'Win',
						endLoseMessage: 'Lose',
					},
				} as any)
				expect.fail('Should have failed')
			}
			catch (err: any) {
				expect(err.statusCode).toBe(400)
			}
		})

		it('should save settings and successfully refresh settings cache', async () => {
			const res = await vaultPutHandler({
				body: {
					minBet: 25,
					maxBet: 75000,
					winMinRoll: 55,
					winMultiplier: 2.5,
					duration: 120,
					warningEnabled: true,
					startMessage: 'New Start',
					warningMessage: 'New Warning',
					endWinMessage: 'New Win',
					endLoseMessage: 'New Lose',
				},
			} as any)

			expect(res.success).toBe(true)

			// Assert in database
			const dbMinBet = await db
				.select()
				.from(settings)
				.where(eq(settings.key, 'points.vault.min_bet'))
				.then(res => res[0])
			expect(dbMinBet?.value).toBe('25')

			// Assert inside synchronous memory cache and template registry
			const cached = getAppSettingsSync()
			expect(cached.pointsVaultMinBet).toBe(25)
			expect(cached.pointsVaultMaxBet).toBe(75000)
			expect(cached.pointsVaultWinMinRoll).toBe(55)
			expect(cached.pointsVaultWinMultiplier).toBe(2.5)
			expect(cached.pointsVaultDuration).toBe(120)
			expect(cached.pointsVaultWarningEnabled).toBe(true)
			expect(templateRegistry.get('vault.start')?.template).toBe('New Start')
			expect(templateRegistry.get('vault.warning')?.template).toBe('New Warning')
			expect(templateRegistry.get('vault.win')?.template).toBe('New Win')
			expect(templateRegistry.get('vault.lose')?.template).toBe('New Lose')
		})
	})

	describe('POST /api/loyalty/vault/trigger & /cancel', () => {
		it('should trigger and cancel vault raid successfully', async () => {
			// Trigger
			const triggerRes = await triggerVaultHandler({} as any)
			expect(triggerRes.success).toBe(true)
			expect(triggerRes.endTime).toBeGreaterThan(Date.now())

			const activeCached = getAppSettingsSync()
			expect(activeCached.pointsVaultEndTime).toBe(triggerRes.endTime)

			// Trigger again should fail (collision prevention)
			try {
				await triggerVaultHandler({} as any)
				expect.fail('Should not be able to trigger active event')
			}
			catch (err: any) {
				expect(err.statusCode).toBe(400)
				expect(err.statusMessage).toBe('A Vault Raid is already active.')
			}

			// Cancel
			const cancelRes = await cancelVaultHandler({} as any)
			expect(cancelRes.success).toBe(true)

			const inactiveCached = getAppSettingsSync()
			expect(inactiveCached.pointsVaultEndTime).toBe(0)
		})
	})
})
