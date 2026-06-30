import { requireUserRole } from '~~/server/utils/auth'
import { getDiscordChannels, isDiscordConnected, isDiscordTokenConfigured, startDiscord } from '~~/server/utils/discord'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')

	if (!isDiscordConnected() && isDiscordTokenConfigured()) {
		await startDiscord()
	}

	const channels = await getDiscordChannels()
	return channels
})
