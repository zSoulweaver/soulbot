import type { CommandHandler } from '~~/server/bot/core/types'
import { getStreamerToken } from '~~/server/utils/twurple'
import { getCurrentGameName, getOrCreateGame } from '../utils'

export const handleDeathsRoot: CommandHandler = async (ctx) => {
	const gameName = await getCurrentGameName()
	const data = await getOrCreateGame(gameName)
	const streamerToken = await getStreamerToken()
	const streamer = streamerToken?.displayName || streamerToken?.userName || 'Streamer'

	const queryCounter = ctx.rawArgs?.join(' ').trim()

	if (queryCounter) {
		const targetCounter = data.counters.find(
			c => c.name.toLowerCase() === queryCounter.toLowerCase(),
		)

		if (!targetCounter) {
			ctx.reply('deaths.counter-not-found', {
				game: data.game.name,
				counter: queryCounter,
			})
			return
		}

		const isDefaultCounter = targetCounter.name.toLowerCase() === 'default'
		const counterSuffix = isDefaultCounter ? '' : ` [${targetCounter.name}]`
		const totalSuffix = data.counters.length > 1 ? ` (Total: ${data.totalDeaths})` : ''

		ctx.reply('deaths.show', {
			streamer,
			game: data.game.name,
			counter: targetCounter.name,
			counter_suffix: counterSuffix,
			count: targetCounter.deaths,
			total: data.totalDeaths,
			total_suffix: totalSuffix,
		})
		return
	}

	const isDefaultCounter = data.activeCounter.name.toLowerCase() === 'default'
	const counterSuffix = isDefaultCounter ? '' : ` [${data.activeCounter.name}]`
	const totalSuffix = data.counters.length > 1 ? ` (Total: ${data.totalDeaths})` : ''

	ctx.reply('deaths.show', {
		streamer,
		game: data.game.name,
		counter: data.activeCounter.name,
		counter_suffix: counterSuffix,
		count: data.activeCounter.deaths,
		total: data.totalDeaths,
		total_suffix: totalSuffix,
	})
}
