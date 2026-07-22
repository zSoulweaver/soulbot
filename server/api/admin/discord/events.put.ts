import { sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '~~/server/database'
import { settings } from '~~/server/database/schema'
import { requireUserRole } from '~~/server/utils/auth'
import { refreshAppSettingsCache } from '~~/server/utils/settings'

const saveDiscordEventsSchema = z.object({
	discordEventJoinEnabled: z.boolean(),
	discordEventJoinChannelId: z.string().max(100, 'Join alert channel ID is too long'),
	discordEventJoinTemplate: z.string().max(500, 'Join alert template is too long'),

	discordRolesAutoBestowEnabled: z.boolean(),
	discordRolesAutoBestowRoles: z.string().max(500, 'Auto bestow roles string is too long'),

	discordEventLeaveEnabled: z.boolean(),
	discordEventLeaveChannelId: z.string().max(100, 'Leave alert channel ID is too long'),
	discordEventLeaveTemplate: z.string().max(500, 'Leave alert template is too long'),
})

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'caster')
	const body = await readBody(event)
	const parsed = saveDiscordEventsSchema.safeParse(body)

	if (!parsed.success) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid Discord event settings data',
			data: parsed.error.format(),
		})
	}

	const d = parsed.data

	const keysToUpsert = [
		{ key: 'discord.events.join.enabled', value: String(d.discordEventJoinEnabled), updatedAt: new Date() },
		{ key: 'discord.events.join.channel_id', value: d.discordEventJoinChannelId, updatedAt: new Date() },
		{ key: 'discord.events.join.template', value: d.discordEventJoinTemplate, updatedAt: new Date() },

		{ key: 'discord.roles.auto_bestow_enabled', value: String(d.discordRolesAutoBestowEnabled), updatedAt: new Date() },
		{ key: 'discord.roles.auto_bestow_roles', value: d.discordRolesAutoBestowRoles, updatedAt: new Date() },

		{ key: 'discord.events.leave.enabled', value: String(d.discordEventLeaveEnabled), updatedAt: new Date() },
		{ key: 'discord.events.leave.channel_id', value: d.discordEventLeaveChannelId, updatedAt: new Date() },
		{ key: 'discord.events.leave.template', value: d.discordEventLeaveTemplate, updatedAt: new Date() },
	]

	for (const item of keysToUpsert) {
		await db
			.insert(settings)
			.values(item)
			.onConflictDoUpdate({
				target: settings.key,
				set: {
					value: item.value,
					updatedAt: sql`EXCLUDED.updated_at`,
				},
			})
	}

	await refreshAppSettingsCache()

	return { success: true }
})
