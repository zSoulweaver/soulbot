import { sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '~~/server/database'
import { settings } from '~~/server/database/schema'
import { requireUserRole } from '~~/server/utils/auth'
import { refreshAppSettingsCache } from '~~/server/utils/settings'

const saveDiscordRolesSchema = z.object({
	discordRolesAutoBestowEnabled: z.boolean(),
	discordRolesAutoBestowRoles: z.string(),
})

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'caster')
	const body = await readBody(event)
	const parsed = saveDiscordRolesSchema.safeParse(body)

	if (!parsed.success) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid Discord roles data',
			data: parsed.error.format(),
		})
	}

	const d = parsed.data

	const keysToUpsert = [
		{ key: 'discord.roles.auto_bestow_enabled', value: String(d.discordRolesAutoBestowEnabled), updatedAt: new Date() },
		{ key: 'discord.roles.auto_bestow_roles', value: d.discordRolesAutoBestowRoles, updatedAt: new Date() },
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
