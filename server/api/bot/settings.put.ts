import { sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '~~/server/database'
import { settings } from '~~/server/database/schema'
import { requireUserRole } from '~~/server/utils/auth'
import { refreshAppSettingsCache } from '~~/server/utils/settings'

const saveBotSettingsSchema = z.object({
	chatMode: z.enum(['normal', 'action']),
	muted: z.boolean(),
})

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')
	const body = await readBody(event)
	const parsed = saveBotSettingsSchema.safeParse(body)

	if (!parsed.success) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid bot settings data',
			data: parsed.error.format(),
		})
	}

	const { chatMode, muted } = parsed.data

	const keysToUpsert = [
		{ key: 'bot.chat_mode', value: chatMode, updatedAt: new Date() },
		{ key: 'bot.muted', value: String(muted), updatedAt: new Date() },
	]

	await db
		.insert(settings)
		.values(keysToUpsert)
		.onConflictDoUpdate({
			target: settings.key,
			set: {
				value: sql`excluded.value`,
				updatedAt: sql`excluded.updated_at`,
			},
		})

	await refreshAppSettingsCache()

	return { success: true }
})
