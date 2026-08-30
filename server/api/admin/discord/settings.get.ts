import { discordSettings } from '~~/server/settings'
import { requireUserRole } from '~~/server/utils/auth'
import { isDiscordConnected, isDiscordTokenConfigured, startDiscord } from '~~/server/utils/discord'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'caster')

	if (!isDiscordConnected() && isDiscordTokenConfigured()) {
		await startDiscord()
	}

	const settings = discordSettings.get()

	return {
		discordEnabled: settings.enabled,
		discordGuildId: settings.guildId,
		discordModerationLogEnabled: settings.moderationLogEnabled,
		discordModerationLogChannelId: settings.moderationLogChannelId,
		isTokenConfigured: isDiscordTokenConfigured(),
		isDiscordConnected: isDiscordConnected(),
	}
})
