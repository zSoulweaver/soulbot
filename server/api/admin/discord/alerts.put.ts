import { sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '~~/server/database'
import { settings } from '~~/server/database/schema'
import { requireUserRole } from '~~/server/utils/auth'
import { refreshAppSettingsCache } from '~~/server/utils/settings'

const saveDiscordAlertsSchema = z.object({
	discordAlertFollowEnabled: z.boolean(),
	discordAlertFollowChannelId: z.string().max(100, 'Follow alert channel ID is too long'),
	discordAlertFollowTemplate: z.string().max(500, 'Follow alert template is too long'),

	discordAlertSubEnabled: z.boolean(),
	discordAlertSubChannelId: z.string().max(100, 'Subscription alert channel ID is too long'),
	discordAlertSubTemplate: z.string().max(500, 'Subscription alert template is too long'),

	discordAlertGiftEnabled: z.boolean(),
	discordAlertGiftChannelId: z.string().max(100, 'Sub-gift alert channel ID is too long'),
	discordAlertGiftTemplate: z.string().max(500, 'Sub-gift alert template is too long'),

	discordAlertCheerEnabled: z.boolean(),
	discordAlertCheerChannelId: z.string().max(100, 'Cheer alert channel ID is too long'),
	discordAlertCheerTemplate: z.string().max(500, 'Cheer alert template is too long'),
})

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'caster')
	const body = await readBody(event)
	const parsed = saveDiscordAlertsSchema.safeParse(body)

	if (!parsed.success) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid Discord alerts settings data',
			data: parsed.error.format(),
		})
	}

	const d = parsed.data

	const keysToUpsert = [
		{ key: 'discord.alerts.follow.enabled', value: String(d.discordAlertFollowEnabled), updatedAt: new Date() },
		{ key: 'discord.alerts.follow.channel_id', value: d.discordAlertFollowChannelId, updatedAt: new Date() },
		{ key: 'discord.alerts.follow.template', value: d.discordAlertFollowTemplate, updatedAt: new Date() },

		{ key: 'discord.alerts.sub.enabled', value: String(d.discordAlertSubEnabled), updatedAt: new Date() },
		{ key: 'discord.alerts.sub.channel_id', value: d.discordAlertSubChannelId, updatedAt: new Date() },
		{ key: 'discord.alerts.sub.template', value: d.discordAlertSubTemplate, updatedAt: new Date() },

		{ key: 'discord.alerts.gift.enabled', value: String(d.discordAlertGiftEnabled), updatedAt: new Date() },
		{ key: 'discord.alerts.gift.channel_id', value: d.discordAlertGiftChannelId, updatedAt: new Date() },
		{ key: 'discord.alerts.gift.template', value: d.discordAlertGiftTemplate, updatedAt: new Date() },

		{ key: 'discord.alerts.cheer.enabled', value: String(d.discordAlertCheerEnabled), updatedAt: new Date() },
		{ key: 'discord.alerts.cheer.channel_id', value: d.discordAlertCheerChannelId, updatedAt: new Date() },
		{ key: 'discord.alerts.cheer.template', value: d.discordAlertCheerTemplate, updatedAt: new Date() },
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
