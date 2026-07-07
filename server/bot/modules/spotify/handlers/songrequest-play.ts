import type { CommandHandler } from '~~/server/bot/core/types'
import { playQueuePlaylist } from '~~/server/utils/spotify'

export const handleSongRequestPlay: CommandHandler = async (ctx) => {
	const success = await playQueuePlaylist()
	if (success) {
		const { triggerQueueEngineTick } = await import('~~/server/bot/modules/spotify/queue-engine')
		setTimeout(() => {
			triggerQueueEngineTick().catch(() => {})
		}, 500)
		return ctx.reply('Started playing the song request playlist.')
	}
	else {
		return ctx.reply('Failed to start playback. Ensure your Spotify player is open and active.')
	}
}
