import { requireUserRole } from '~~/server/utils/auth'
import { getDiscordRoles, isDiscordConnected, isDiscordTokenConfigured, startDiscord } from '~~/server/utils/discord'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')

	if (!isDiscordConnected() && isDiscordTokenConfigured()) {
		await startDiscord()
	}

	const roles = await getDiscordRoles()
	return roles
})
