import { requireUserRole } from '~~/server/utils/auth'
import { isDiscordConnected, isDiscordTokenConfigured, startDiscord } from '~~/server/utils/discord'
import { getAppSettings } from '~~/server/utils/settings'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'caster')

	if (!isDiscordConnected() && isDiscordTokenConfigured()) {
		await startDiscord()
	}

	const settings = await getAppSettings()

	return {
		discordEnabled: settings.discordEnabled,
		discordGuildId: settings.discordGuildId,
		discordModerationLogEnabled: settings.discordModerationLogEnabled,
		discordModerationLogChannelId: settings.discordModerationLogChannelId,
		isTokenConfigured: isDiscordTokenConfigured(),
		isDiscordConnected: isDiscordConnected(),
	}
})
