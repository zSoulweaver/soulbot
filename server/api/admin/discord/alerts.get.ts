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
	const getVal = (id: string) => templateRegistry.get(id)?.template || ''

	return {
		discordAlertFollowEnabled: settings.alertFollowEnabled,
		discordAlertFollowChannelId: settings.alertFollowChannelId,
		discordAlertFollowTemplate: getVal('discord.alert.follow'),

		discordAlertSubEnabled: settings.alertSubEnabled,
		discordAlertSubChannelId: settings.alertSubChannelId,
		discordAlertSubTemplate: getVal('discord.alert.sub'),

		discordAlertGiftEnabled: settings.alertGiftEnabled,
		discordAlertGiftChannelId: settings.alertGiftChannelId,
		discordAlertGiftTemplate: getVal('discord.alert.gift'),

		discordAlertCheerEnabled: settings.alertCheerEnabled,
		discordAlertCheerChannelId: settings.alertCheerChannelId,
		discordAlertCheerTemplate: getVal('discord.alert.cheer'),

		discordAlertRaidEnabled: settings.alertRaidEnabled,
		discordAlertRaidChannelId: settings.alertRaidChannelId,
		discordAlertRaidTemplate: getVal('discord.alert.raid'),

		discordAlertLiveEnabled: settings.alertLiveEnabled,
		discordAlertLiveChannelId: settings.alertLiveChannelId,
		discordAlertLiveTemplate: getVal('discord.alert.live'),
		discordAlertLiveRemoveOffline: settings.alertLiveRemoveOffline,

		discordAlertOfflineEnabled: settings.alertOfflineEnabled,
		discordAlertOfflineChannelId: settings.alertOfflineChannelId,
		discordAlertOfflineTemplate: getVal('discord.alert.offline'),

		discordAlertBanEnabled: settings.alertBanEnabled,
		discordAlertBanChannelId: settings.alertBanChannelId,
		discordAlertBanTemplate: getVal('discord.alert.ban'),

		discordAlertTimeoutEnabled: settings.alertTimeoutEnabled,
		discordAlertTimeoutChannelId: settings.alertTimeoutChannelId,
		discordAlertTimeoutTemplate: getVal('discord.alert.timeout'),

		discordAlertUnbanEnabled: settings.alertUnbanEnabled,
		discordAlertUnbanChannelId: settings.alertUnbanChannelId,
		discordAlertUnbanTemplate: getVal('discord.alert.unban'),

		discordAlertMessageDeleteEnabled: settings.alertMessageDeleteEnabled,
		discordAlertMessageDeleteChannelId: settings.alertMessageDeleteChannelId,
		discordAlertMessageDeleteTemplate: getVal('discord.alert.message_delete'),

		isDiscordConnected: isDiscordConnected(),
	}
})
