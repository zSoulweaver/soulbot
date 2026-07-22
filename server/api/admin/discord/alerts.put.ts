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

	discordAlertRaidEnabled: z.boolean().optional(),
	discordAlertRaidChannelId: z.string().max(100, 'Raid alert channel ID is too long').optional(),
	discordAlertRaidTemplate: z.string().max(500, 'Raid alert template is too long').optional(),

	discordAlertLiveEnabled: z.boolean().optional(),
	discordAlertLiveChannelId: z.string().max(100, 'Live alert channel ID is too long').optional(),
	discordAlertLiveTemplate: z.string().max(500, 'Live alert template is too long').optional(),
	discordAlertLiveRemoveOffline: z.boolean().optional(),

	discordAlertOfflineEnabled: z.boolean().optional(),
	discordAlertOfflineChannelId: z.string().max(100, 'Offline alert channel ID is too long').optional(),
	discordAlertOfflineTemplate: z.string().max(500, 'Offline alert template is too long').optional(),

	discordAlertBanEnabled: z.boolean().optional(),
	discordAlertBanChannelId: z.string().max(100, 'Ban alert channel ID is too long').optional(),
	discordAlertBanTemplate: z.string().max(500, 'Ban alert template is too long').optional(),

	discordAlertTimeoutEnabled: z.boolean().optional(),
	discordAlertTimeoutChannelId: z.string().max(100, 'Timeout alert channel ID is too long').optional(),
	discordAlertTimeoutTemplate: z.string().max(500, 'Timeout alert template is too long').optional(),

	discordAlertUnbanEnabled: z.boolean().optional(),
	discordAlertUnbanChannelId: z.string().max(100, 'Unban alert channel ID is too long').optional(),
	discordAlertUnbanTemplate: z.string().max(500, 'Unban alert template is too long').optional(),

	discordAlertMessageDeleteEnabled: z.boolean().optional(),
	discordAlertMessageDeleteChannelId: z.string().max(100, 'Message delete alert channel ID is too long').optional(),
	discordAlertMessageDeleteTemplate: z.string().max(500, 'Message delete alert template is too long').optional(),
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

	if (d.discordAlertRaidEnabled !== undefined) {
		keysToUpsert.push({ key: 'discord.alerts.raid.enabled', value: String(d.discordAlertRaidEnabled), updatedAt: new Date() })
	}
	if (d.discordAlertRaidChannelId !== undefined) {
		keysToUpsert.push({ key: 'discord.alerts.raid.channel_id', value: d.discordAlertRaidChannelId, updatedAt: new Date() })
	}
	if (d.discordAlertRaidTemplate !== undefined) {
		keysToUpsert.push({ key: 'discord.alerts.raid.template', value: d.discordAlertRaidTemplate, updatedAt: new Date() })
	}

	if (d.discordAlertLiveEnabled !== undefined) {
		keysToUpsert.push({ key: 'discord.alerts.live.enabled', value: String(d.discordAlertLiveEnabled), updatedAt: new Date() })
	}
	if (d.discordAlertLiveChannelId !== undefined) {
		keysToUpsert.push({ key: 'discord.alerts.live.channel_id', value: d.discordAlertLiveChannelId, updatedAt: new Date() })
	}
	if (d.discordAlertLiveTemplate !== undefined) {
		keysToUpsert.push({ key: 'discord.alerts.live.template', value: d.discordAlertLiveTemplate, updatedAt: new Date() })
	}
	if (d.discordAlertLiveRemoveOffline !== undefined) {
		keysToUpsert.push({ key: 'discord.alerts.live.remove_offline', value: String(d.discordAlertLiveRemoveOffline), updatedAt: new Date() })
	}

	if (d.discordAlertOfflineEnabled !== undefined) {
		keysToUpsert.push({ key: 'discord.alerts.offline.enabled', value: String(d.discordAlertOfflineEnabled), updatedAt: new Date() })
	}
	if (d.discordAlertOfflineChannelId !== undefined) {
		keysToUpsert.push({ key: 'discord.alerts.offline.channel_id', value: d.discordAlertOfflineChannelId, updatedAt: new Date() })
	}
	if (d.discordAlertOfflineTemplate !== undefined) {
		keysToUpsert.push({ key: 'discord.alerts.offline.template', value: d.discordAlertOfflineTemplate, updatedAt: new Date() })
	}

	if (d.discordAlertBanEnabled !== undefined) {
		keysToUpsert.push({ key: 'discord.alerts.ban.enabled', value: String(d.discordAlertBanEnabled), updatedAt: new Date() })
	}
	if (d.discordAlertBanChannelId !== undefined) {
		keysToUpsert.push({ key: 'discord.alerts.ban.channel_id', value: d.discordAlertBanChannelId, updatedAt: new Date() })
	}
	if (d.discordAlertBanTemplate !== undefined) {
		keysToUpsert.push({ key: 'discord.alerts.ban.template', value: d.discordAlertBanTemplate, updatedAt: new Date() })
	}

	if (d.discordAlertTimeoutEnabled !== undefined) {
		keysToUpsert.push({ key: 'discord.alerts.timeout.enabled', value: String(d.discordAlertTimeoutEnabled), updatedAt: new Date() })
	}
	if (d.discordAlertTimeoutChannelId !== undefined) {
		keysToUpsert.push({ key: 'discord.alerts.timeout.channel_id', value: d.discordAlertTimeoutChannelId, updatedAt: new Date() })
	}
	if (d.discordAlertTimeoutTemplate !== undefined) {
		keysToUpsert.push({ key: 'discord.alerts.timeout.template', value: d.discordAlertTimeoutTemplate, updatedAt: new Date() })
	}

	if (d.discordAlertUnbanEnabled !== undefined) {
		keysToUpsert.push({ key: 'discord.alerts.unban.enabled', value: String(d.discordAlertUnbanEnabled), updatedAt: new Date() })
	}
	if (d.discordAlertUnbanChannelId !== undefined) {
		keysToUpsert.push({ key: 'discord.alerts.unban.channel_id', value: d.discordAlertUnbanChannelId, updatedAt: new Date() })
	}
	if (d.discordAlertUnbanTemplate !== undefined) {
		keysToUpsert.push({ key: 'discord.alerts.unban.template', value: d.discordAlertUnbanTemplate, updatedAt: new Date() })
	}

	if (d.discordAlertMessageDeleteEnabled !== undefined) {
		keysToUpsert.push({ key: 'discord.alerts.message_delete.enabled', value: String(d.discordAlertMessageDeleteEnabled), updatedAt: new Date() })
	}
	if (d.discordAlertMessageDeleteChannelId !== undefined) {
		keysToUpsert.push({ key: 'discord.alerts.message_delete.channel_id', value: d.discordAlertMessageDeleteChannelId, updatedAt: new Date() })
	}
	if (d.discordAlertMessageDeleteTemplate !== undefined) {
		keysToUpsert.push({ key: 'discord.alerts.message_delete.template', value: d.discordAlertMessageDeleteTemplate, updatedAt: new Date() })
	}

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
