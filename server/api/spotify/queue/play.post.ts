import { requireUserRole } from '~~/server/utils/auth'
import { playQueuePlaylist } from '~~/server/utils/spotify'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'caster')

	const success = await playQueuePlaylist()
	if (!success) {
		throw createError({
			statusCode: 500,
			statusMessage: 'Failed to start Spotify playback. Ensure a Spotify player is open and active on one of your devices.',
		})
	}

	// Wait a brief moment for Spotify playback to register, then trigger queue engine sync
	await new Promise(resolve => setTimeout(resolve, 500))
	const { triggerQueueEngineTick } = await import('~~/server/bot/modules/spotify/queue-engine')
	await triggerQueueEngineTick()

	return { success: true }
})
