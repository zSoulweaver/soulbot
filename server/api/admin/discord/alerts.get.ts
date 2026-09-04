import { templateRegistry } from '~~/server/bot/core/templates'
import { discordSettings } from '~~/server/settings'
import { requireUserRole } from '~~/server/utils/auth'
import { isDiscordConnected, isDiscordTokenConfigured, startDiscord } from '~~/server/utils/discord'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')

	if (!isDiscordConnected() && isDiscordTokenConfigured()) {
		await startDiscord()
	}

	const settings = discordSettings.get()
	const getVal = (id: string, fallback: string) => {
		const t = templateRegistry.get(id)
		return t?.isOverridden ? t.current : fallback
	}

	return {
		discordAlertFollowEnabled: settings.alertFollowEnabled,
		discordAlertFollowChannelId: settings.alertFollowChannelId,
		discordAlertFollowTemplate: getVal('discord.alert.follow', settings.alertFollowTemplate),

		discordAlertSubEnabled: settings.alertSubEnabled,
		discordAlertSubChannelId: settings.alertSubChannelId,
		discordAlertSubTemplate: getVal('discord.alert.sub', settings.alertSubTemplate),

		discordAlertGiftEnabled: settings.alertGiftEnabled,
		discordAlertGiftChannelId: settings.alertGiftChannelId,
		discordAlertGiftTemplate: getVal('discord.alert.gift', settings.alertGiftTemplate),

		discordAlertCheerEnabled: settings.alertCheerEnabled,
		discordAlertCheerChannelId: settings.alertCheerChannelId,
		discordAlertCheerTemplate: getVal('discord.alert.cheer', settings.alertCheerTemplate),

		discordAlertRaidEnabled: settings.alertRaidEnabled,
		discordAlertRaidChannelId: settings.alertRaidChannelId,
		discordAlertRaidTemplate: getVal('discord.alert.raid', settings.alertRaidTemplate),

		discordAlertLiveEnabled: settings.alertLiveEnabled,
		discordAlertLiveChannelId: settings.alertLiveChannelId,
		discordAlertLiveTemplate: getVal('discord.alert.live', settings.alertLiveTemplate),
		discordAlertLiveRemoveOffline: settings.alertLiveRemoveOffline,

		discordAlertOfflineEnabled: settings.alertOfflineEnabled,
		discordAlertOfflineChannelId: settings.alertOfflineChannelId,
		discordAlertOfflineTemplate: getVal('discord.alert.offline', settings.alertOfflineTemplate),

		discordAlertBanEnabled: settings.alertBanEnabled,
		discordAlertBanChannelId: settings.alertBanChannelId,
		discordAlertBanTemplate: getVal('discord.alert.ban', settings.alertBanTemplate),

		discordAlertTimeoutEnabled: settings.alertTimeoutEnabled,
		discordAlertTimeoutChannelId: settings.alertTimeoutChannelId,
		discordAlertTimeoutTemplate: getVal('discord.alert.timeout', settings.alertTimeoutTemplate),

		discordAlertUnbanEnabled: settings.alertUnbanEnabled,
		discordAlertUnbanChannelId: settings.alertUnbanChannelId,
		discordAlertUnbanTemplate: getVal('discord.alert.unban', settings.alertUnbanTemplate),

		discordAlertMessageDeleteEnabled: settings.alertMessageDeleteEnabled,
		discordAlertMessageDeleteChannelId: settings.alertMessageDeleteChannelId,
		discordAlertMessageDeleteTemplate: getVal('discord.alert.message_delete', settings.alertMessageDeleteTemplate),

		isDiscordConnected: isDiscordConnected(),
	}
})
