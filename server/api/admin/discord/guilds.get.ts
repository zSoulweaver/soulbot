import { requireUserRole } from '~~/server/utils/auth'
import { getDiscordGuilds, isDiscordConnected, isDiscordTokenConfigured, startDiscord } from '~~/server/utils/discord'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'caster')

	if (!isDiscordConnected() && isDiscordTokenConfigured()) {
		await startDiscord()
	}

	const guilds = await getDiscordGuilds()
	return guilds
})
