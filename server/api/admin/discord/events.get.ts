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
		discordEventJoinEnabled: settings.discordEventJoinEnabled,
		discordEventJoinChannelId: settings.discordEventJoinChannelId,
		discordEventJoinTemplate: settings.discordEventJoinTemplate,

		discordRolesAutoBestowEnabled: settings.discordRolesAutoBestowEnabled,
		discordRolesAutoBestowRoles: settings.discordRolesAutoBestowRoles,

		discordEventLeaveEnabled: settings.discordEventLeaveEnabled,
		discordEventLeaveChannelId: settings.discordEventLeaveChannelId,
		discordEventLeaveTemplate: settings.discordEventLeaveTemplate,

		isDiscordConnected: isDiscordConnected(),
	}
})
