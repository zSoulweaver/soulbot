import { discordSettings } from '~~/server/settings'
import { requireUserRole } from '~~/server/utils/auth'
import { isDiscordConnected, isDiscordTokenConfigured, startDiscord } from '~~/server/utils/discord'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')

	if (!isDiscordConnected() && isDiscordTokenConfigured()) {
		await startDiscord()
	}

	const settings = discordSettings.get()

	return {
		discordAlertFollowEnabled: settings.alertFollowEnabled,
		discordAlertFollowChannelId: settings.alertFollowChannelId,
		discordAlertFollowTemplate: settings.alertFollowTemplate,

		discordAlertSubEnabled: settings.alertSubEnabled,
		discordAlertSubChannelId: settings.alertSubChannelId,
		discordAlertSubTemplate: settings.alertSubTemplate,

		discordAlertGiftEnabled: settings.alertGiftEnabled,
		discordAlertGiftChannelId: settings.alertGiftChannelId,
		discordAlertGiftTemplate: settings.alertGiftTemplate,

		discordAlertCheerEnabled: settings.alertCheerEnabled,
		discordAlertCheerChannelId: settings.alertCheerChannelId,
		discordAlertCheerTemplate: settings.alertCheerTemplate,

		discordAlertRaidEnabled: settings.alertRaidEnabled,
		discordAlertRaidChannelId: settings.alertRaidChannelId,
		discordAlertRaidTemplate: settings.alertRaidTemplate,

		discordAlertLiveEnabled: settings.alertLiveEnabled,
		discordAlertLiveChannelId: settings.alertLiveChannelId,
		discordAlertLiveTemplate: settings.alertLiveTemplate,
		discordAlertLiveRemoveOffline: settings.alertLiveRemoveOffline,

		discordAlertOfflineEnabled: settings.alertOfflineEnabled,
		discordAlertOfflineChannelId: settings.alertOfflineChannelId,
		discordAlertOfflineTemplate: settings.alertOfflineTemplate,

		discordAlertBanEnabled: settings.alertBanEnabled,
		discordAlertBanChannelId: settings.alertBanChannelId,
		discordAlertBanTemplate: settings.alertBanTemplate,

		discordAlertTimeoutEnabled: settings.alertTimeoutEnabled,
		discordAlertTimeoutChannelId: settings.alertTimeoutChannelId,
		discordAlertTimeoutTemplate: settings.alertTimeoutTemplate,

		discordAlertUnbanEnabled: settings.alertUnbanEnabled,
		discordAlertUnbanChannelId: settings.alertUnbanChannelId,
		discordAlertUnbanTemplate: settings.alertUnbanTemplate,

		discordAlertMessageDeleteEnabled: settings.alertMessageDeleteEnabled,
		discordAlertMessageDeleteChannelId: settings.alertMessageDeleteChannelId,
		discordAlertMessageDeleteTemplate: settings.alertMessageDeleteTemplate,

		isDiscordConnected: isDiscordConnected(),
	}
})
