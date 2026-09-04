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

	return {
		discordEventJoinEnabled: settings.eventJoinEnabled,
		discordEventJoinChannelId: settings.eventJoinChannelId,
		discordEventJoinTemplate: templateRegistry.get('discord.events.join')?.template || '',

		discordRolesAutoBestowEnabled: settings.rolesAutoBestowEnabled,
		discordRolesAutoBestowRoles: settings.rolesAutoBestowRoles,

		discordEventLeaveEnabled: settings.eventLeaveEnabled,
		discordEventLeaveChannelId: settings.eventLeaveChannelId,
		discordEventLeaveTemplate: templateRegistry.get('discord.events.leave')?.template || '',

		isDiscordConnected: isDiscordConnected(),
	}
})
