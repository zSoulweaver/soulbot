import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import settingsGetHandler from '~~/server/api/bot/settings.get'
import settingsPutHandler from '~~/server/api/bot/settings.put'
import { db } from '~~/server/database'
import { settings } from '~~/server/database/schema'
import { getAppSettingsSync, refreshAppSettingsCache } from '~~/server/utils/settings'
import { clearDatabase } from '../helpers'

describe('Bot Settings API Routes', () => {
	beforeEach(async () => {
		await clearDatabase()
	})

	describe('GET /api/bot/settings', () => {
		it('should return default settings if none are configured in database', async () => {
			const res = await settingsGetHandler({} as any)
			expect(res).toBeDefined()
			expect(res.chatMode).toBe('action')
			expect(res.muted).toBe(false)
		})

		it('should return actual database settings when configured', async () => {
			await db.insert(settings).values([
				{ key: 'bot.chat_mode', value: 'normal', updatedAt: new Date() },
				{ key: 'bot.muted', value: 'true', updatedAt: new Date() },
			])

			await refreshAppSettingsCache()

			const res = await settingsGetHandler({} as any)
			expect(res.chatMode).toBe('normal')
			expect(res.muted).toBe(true)
		})
	})

	describe('PUT /api/bot/settings', () => {
		it('should fail with 400 status if validation fails', async () => {
			try {
				await settingsPutHandler({
					body: {
						chatMode: 'invalid_mode',
						muted: 'not_a_boolean',
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
					chatMode: 'normal',
					muted: true,
				},
			} as any)

			expect(res.success).toBe(true)

			// Assert in database
			const dbMuted = await db
				.select()
				.from(settings)
				.where(eq(settings.key, 'bot.muted'))
				.then(res => res[0])
			expect(dbMuted?.value).toBe('true')

			const dbChatMode = await db
				.select()
				.from(settings)
				.where(eq(settings.key, 'bot.chat_mode'))
				.then(res => res[0])
			expect(dbChatMode?.value).toBe('normal')

			// Assert inside synchronous memory cache
			const cached = getAppSettingsSync()
			expect(cached.botChatMode).toBe('normal')
			expect(cached.botMuted).toBe(true)
		})
	})
})
