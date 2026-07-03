import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import adsCommercialPostHandler from '~~/server/api/admin/advertisements/commercial.post'
import adsScheduleGetHandler from '~~/server/api/admin/advertisements/schedule.get'
import adsSettingsGetHandler from '~~/server/api/admin/advertisements/settings.get'
import adsSettingsPutHandler from '~~/server/api/admin/advertisements/settings.put'
import adsSnoozePostHandler from '~~/server/api/admin/advertisements/snooze.post'
import { db } from '~~/server/database'
import { settings, twitchTokens } from '~~/server/database/schema'
import { getAppSettingsSync } from '~~/server/utils/settings'
import { clearDatabase } from '../helpers'
import { mockApiClient, mockGetStreamInfo } from '../setup'

describe('Admin Advertisements API Routes', () => {
	beforeEach(async () => {
		await clearDatabase()
		vi.clearAllMocks()
	})

	describe('GET /api/admin/advertisements/settings', () => {
		it('should return default settings if none exist', async () => {
			const res = await adsSettingsGetHandler({} as any)
			expect(res.adsAlertsEnabled).toBe(false)
			expect(res.adsAlert5mEnabled).toBe(false)
			expect(res.adsAlert3mEnabled).toBe(false)
			expect(res.adsAlert1mEnabled).toBe(false)
			expect(res.adsAlertTemplate).toContain('Ad break of')
		})

		it('should return database settings if configured', async () => {
			await db.insert(settings).values([
				{ key: 'ads.alerts.enabled', value: 'true', updatedAt: new Date() },
				{ key: 'ads.alerts.5m.enabled', value: 'true', updatedAt: new Date() },
				{ key: 'ads.alerts.template', value: 'Ad starting soon!', updatedAt: new Date() },
			])

			const { refreshAppSettingsCache } = await import('~~/server/utils/settings')
			await refreshAppSettingsCache()

			const res = await adsSettingsGetHandler({} as any)
			expect(res.adsAlertsEnabled).toBe(true)
			expect(res.adsAlert5mEnabled).toBe(true)
			expect(res.adsAlertTemplate).toBe('Ad starting soon!')
		})
	})

	describe('PUT /api/admin/advertisements/settings', () => {
		it('should fail validation with invalid payload', async () => {
			try {
				await adsSettingsPutHandler({
					body: {
						adsAlertsEnabled: 'invalid-boolean',
					},
				} as any)
				expect.fail('Should fail validation')
			}
			catch (err: any) {
				expect(err.statusCode).toBe(400)
			}
		})

		it('should save settings and refresh cache', async () => {
			const res = await adsSettingsPutHandler({
				body: {
					adsAlertsEnabled: true,
					adsAlert5mEnabled: true,
					adsAlert3mEnabled: false,
					adsAlert1mEnabled: true,
					adsAlertTemplate: 'Ad break in $(time)',
				},
			} as any)

			expect(res.success).toBe(true)

			const dbVal = await db
				.select()
				.from(settings)
				.where(eq(settings.key, 'ads.alerts.enabled'))
				.then(res => res[0])
			expect(dbVal?.value).toBe('true')

			const cached = getAppSettingsSync()
			expect(cached.adsAlertsEnabled).toBe(true)
			expect(cached.adsAlertTemplate).toBe('Ad break in $(time)')
		})
	})

	describe('GET /api/admin/advertisements/schedule', () => {
		it('should return offline status if stream is offline', async () => {
			// Seed twitch token
			await db.insert(twitchTokens).values({
				accountType: 'streamer',
				userId: 'streamer-id',
				userName: 'streamer',
				displayName: 'Streamer',
				accessToken: 'mock-access',
				refreshToken: 'mock-refresh',
				expiresIn: 3600,
				obtainmentTimestamp: Date.now(),
				scope: JSON.stringify([]),
			})
			mockGetStreamInfo.mockResolvedValueOnce({ isOnline: false })

			const res = await adsScheduleGetHandler({} as any)
			expect(res.isConfigured).toBe(true)
			expect(res.isOnline).toBe(false)
			expect(res.nextAdAt).toBeNull()
		})

		it('should return schedule if stream is online', async () => {
			await db.insert(twitchTokens).values({
				accountType: 'streamer',
				userId: 'streamer-id',
				userName: 'streamer',
				displayName: 'Streamer',
				accessToken: 'mock-access',
				refreshToken: 'mock-refresh',
				expiresIn: 3600,
				obtainmentTimestamp: Date.now(),
				scope: JSON.stringify([]),
			})
			mockGetStreamInfo.mockResolvedValueOnce({ isOnline: true })

			const res = await adsScheduleGetHandler({} as any)
			expect(res.isOnline).toBe(true)
			expect(res.snoozeCount).toBe(3)
			expect(res.nextAdAt).toBeDefined()
			expect(res.duration).toBe(90)
		})
	})

	describe('POST /api/admin/advertisements/snooze', () => {
		it('should snooze upcoming ad successfully', async () => {
			await db.insert(twitchTokens).values({
				accountType: 'streamer',
				userId: 'streamer-id',
				userName: 'streamer',
				displayName: 'Streamer',
				accessToken: 'mock-access',
				refreshToken: 'mock-refresh',
				expiresIn: 3600,
				obtainmentTimestamp: Date.now(),
				scope: JSON.stringify([]),
			})

			const res = await adsSnoozePostHandler({} as any)
			expect(res.success).toBe(true)
			expect(res.snoozeCount).toBe(2)
			expect(mockApiClient.channels.snoozeNextAd).toHaveBeenCalledWith('streamer-id')
		})
	})

	describe('POST /api/admin/advertisements/commercial', () => {
		it('should trigger a commercial break successfully', async () => {
			await db.insert(twitchTokens).values({
				accountType: 'streamer',
				userId: 'streamer-id',
				userName: 'streamer',
				displayName: 'Streamer',
				accessToken: 'mock-access',
				refreshToken: 'mock-refresh',
				expiresIn: 3600,
				obtainmentTimestamp: Date.now(),
				scope: JSON.stringify([]),
			})

			const res = await adsCommercialPostHandler({
				body: { length: 60 },
			} as any)

			expect(res.success).toBe(true)
			expect(mockApiClient.channels.startChannelCommercial).toHaveBeenCalledWith('streamer-id', 60)
		})
	})
})
