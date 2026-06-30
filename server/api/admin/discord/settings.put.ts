import { sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '~~/server/database'
import { settings } from '~~/server/database/schema'
import { requireUserRole } from '~~/server/utils/auth'
import { startDiscord, stopDiscord } from '~~/server/utils/discord'
import { refreshAppSettingsCache } from '~~/server/utils/settings'

const saveDiscordSettingsSchema = z.object({
	discordEnabled: z.boolean(),
	discordGuildId: z.string().max(100, 'Guild ID is too long'),
})

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'caster')
	const body = await readBody(event)
	const parsed = saveDiscordSettingsSchema.safeParse(body)

	if (!parsed.success) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid Discord settings data',
			data: parsed.error.format(),
		})
	}

	const d = parsed.data

	if (d.discordEnabled && !d.discordGuildId) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Cannot enable Discord integration without a Guild ID configured',
		})
	}

	const keysToUpsert = [
		{ key: 'discord.enabled', value: String(d.discordEnabled), updatedAt: new Date() },
		{ key: 'discord.guild_id', value: d.discordGuildId, updatedAt: new Date() },
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

	if (d.discordEnabled) {
		await startDiscord()
	}
	else {
		await stopDiscord()
	}

	return { success: true }
})
