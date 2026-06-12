import { triggerQueueEngineTick } from '~~/server/bot/modules/spotify/queue-engine'
import { requireUserRole } from '~~/server/utils/auth'
import { getValidSpotifyToken } from '~~/server/utils/spotify'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')

	const token = await getValidSpotifyToken()
	if (!token) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Spotify account not connected',
		})
	}

	try {
		await $fetch('https://api.spotify.com/v1/me/player/next', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token.accessToken}`,
			},
		})

		// Trigger immediate queue engine sync
		await triggerQueueEngineTick()

		return { success: true }
	}
	catch (err: any) {
		throw createError({
			statusCode: 500,
			statusMessage: err.data?.error?.message || 'Failed to skip Spotify track.',
		})
	}
})
