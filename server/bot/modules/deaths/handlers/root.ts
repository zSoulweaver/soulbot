import type { CommandHandler } from '~~/server/bot/core/types'
import { getStreamerToken } from '~~/server/utils/twurple'
import { getCurrentGameName, getOrCreateGameDeathRecord } from '../utils'

export const handleDeathsRoot: CommandHandler = async (ctx) => {
	const gameName = await getCurrentGameName()
	const record = await getOrCreateGameDeathRecord(gameName)
	const streamerToken = await getStreamerToken()
	const streamer = streamerToken?.displayName || streamerToken?.userName || 'Streamer'

	ctx.reply('deaths.show', {
		streamer,
		game: record.gameName,
		count: record.deaths,
	})
}
