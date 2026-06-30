import { requireUserRole } from '~~/server/utils/auth'
import { isDiscordConnected, isDiscordTokenConfigured, startDiscord } from '~~/server/utils/discord'
import { getAppSettings } from '~~/server/utils/settings'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')

	if (!isDiscordConnected() && isDiscordTokenConfigured()) {
		await startDiscord()
	}

	const settings = await getAppSettings()

	return {
		discordAlertFollowEnabled: settings.discordAlertFollowEnabled,
		discordAlertFollowChannelId: settings.discordAlertFollowChannelId,
		discordAlertFollowTemplate: settings.discordAlertFollowTemplate,

		discordAlertSubEnabled: settings.discordAlertSubEnabled,
		discordAlertSubChannelId: settings.discordAlertSubChannelId,
		discordAlertSubTemplate: settings.discordAlertSubTemplate,

		discordAlertGiftEnabled: settings.discordAlertGiftEnabled,
		discordAlertGiftChannelId: settings.discordAlertGiftChannelId,
		discordAlertGiftTemplate: settings.discordAlertGiftTemplate,

		discordAlertCheerEnabled: settings.discordAlertCheerEnabled,
		discordAlertCheerChannelId: settings.discordAlertCheerChannelId,
		discordAlertCheerTemplate: settings.discordAlertCheerTemplate,

		isDiscordConnected: isDiscordConnected(),
	}
})
