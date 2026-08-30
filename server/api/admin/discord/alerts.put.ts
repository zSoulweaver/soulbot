import { z } from 'zod'
import { discordSettings } from '~~/server/settings'
import { requireUserRole } from '~~/server/utils/auth'

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
			statusMessage: 'Invalid Discord alert settings data',
			data: parsed.error.format(),
		})
	}

	const d = parsed.data

	const updatePayload: Record<string, any> = {
		alertFollowEnabled: d.discordAlertFollowEnabled,
		alertFollowChannelId: d.discordAlertFollowChannelId,
		alertFollowTemplate: d.discordAlertFollowTemplate,

		alertSubEnabled: d.discordAlertSubEnabled,
		alertSubChannelId: d.discordAlertSubChannelId,
		alertSubTemplate: d.discordAlertSubTemplate,

		alertGiftEnabled: d.discordAlertGiftEnabled,
		alertGiftChannelId: d.discordAlertGiftChannelId,
		alertGiftTemplate: d.discordAlertGiftTemplate,

		alertCheerEnabled: d.discordAlertCheerEnabled,
		alertCheerChannelId: d.discordAlertCheerChannelId,
		alertCheerTemplate: d.discordAlertCheerTemplate,
	}

	if (d.discordAlertRaidEnabled !== undefined) {
		updatePayload.alertRaidEnabled = d.discordAlertRaidEnabled
	}
	if (d.discordAlertRaidChannelId !== undefined) {
		updatePayload.alertRaidChannelId = d.discordAlertRaidChannelId
	}
	if (d.discordAlertRaidTemplate !== undefined) {
		updatePayload.alertRaidTemplate = d.discordAlertRaidTemplate
	}

	if (d.discordAlertLiveEnabled !== undefined) {
		updatePayload.alertLiveEnabled = d.discordAlertLiveEnabled
	}
	if (d.discordAlertLiveChannelId !== undefined) {
		updatePayload.alertLiveChannelId = d.discordAlertLiveChannelId
	}
	if (d.discordAlertLiveTemplate !== undefined) {
		updatePayload.alertLiveTemplate = d.discordAlertLiveTemplate
	}
	if (d.discordAlertLiveRemoveOffline !== undefined) {
		updatePayload.alertLiveRemoveOffline = d.discordAlertLiveRemoveOffline
	}

	if (d.discordAlertOfflineEnabled !== undefined) {
		updatePayload.alertOfflineEnabled = d.discordAlertOfflineEnabled
	}
	if (d.discordAlertOfflineChannelId !== undefined) {
		updatePayload.alertOfflineChannelId = d.discordAlertOfflineChannelId
	}
	if (d.discordAlertOfflineTemplate !== undefined) {
		updatePayload.alertOfflineTemplate = d.discordAlertOfflineTemplate
	}

	if (d.discordAlertBanEnabled !== undefined) {
		updatePayload.alertBanEnabled = d.discordAlertBanEnabled
	}
	if (d.discordAlertBanChannelId !== undefined) {
		updatePayload.alertBanChannelId = d.discordAlertBanChannelId
	}
	if (d.discordAlertBanTemplate !== undefined) {
		updatePayload.alertBanTemplate = d.discordAlertBanTemplate
	}

	if (d.discordAlertTimeoutEnabled !== undefined) {
		updatePayload.alertTimeoutEnabled = d.discordAlertTimeoutEnabled
	}
	if (d.discordAlertTimeoutChannelId !== undefined) {
		updatePayload.alertTimeoutChannelId = d.discordAlertTimeoutChannelId
	}
	if (d.discordAlertTimeoutTemplate !== undefined) {
		updatePayload.alertTimeoutTemplate = d.discordAlertTimeoutTemplate
	}

	if (d.discordAlertUnbanEnabled !== undefined) {
		updatePayload.alertUnbanEnabled = d.discordAlertUnbanEnabled
	}
	if (d.discordAlertUnbanChannelId !== undefined) {
		updatePayload.alertUnbanChannelId = d.discordAlertUnbanChannelId
	}
	if (d.discordAlertUnbanTemplate !== undefined) {
		updatePayload.alertUnbanTemplate = d.discordAlertUnbanTemplate
	}

	if (d.discordAlertMessageDeleteEnabled !== undefined) {
		updatePayload.alertMessageDeleteEnabled = d.discordAlertMessageDeleteEnabled
	}
	if (d.discordAlertMessageDeleteChannelId !== undefined) {
		updatePayload.alertMessageDeleteChannelId = d.discordAlertMessageDeleteChannelId
	}
	if (d.discordAlertMessageDeleteTemplate !== undefined) {
		updatePayload.alertMessageDeleteTemplate = d.discordAlertMessageDeleteTemplate
	}

	await discordSettings.update(updatePayload)

	return { success: true }
})
