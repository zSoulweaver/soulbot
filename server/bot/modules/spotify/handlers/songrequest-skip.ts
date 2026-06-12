import type { CommandHandler } from '~~/server/bot/core/types'
import { getValidSpotifyToken } from '~~/server/utils/spotify'
import { triggerQueueEngineTick } from '../queue-engine'

export const handleSongRequestSkip: CommandHandler = async (ctx) => {
	const token = await getValidSpotifyToken()
	if (!token)
		return

	try {
		await $fetch('https://api.spotify.com/v1/me/player/next', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token.accessToken}`,
			},
		})
		await triggerQueueEngineTick()
		return ctx.reply('Skipped current song.')
	}
	catch {
		return ctx.reply('Failed to skip track.')
	}
}
