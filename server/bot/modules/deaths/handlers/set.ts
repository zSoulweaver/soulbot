import type { CommandHandler } from '~~/server/bot/core/types'
import type { DeathsSetArgs } from '../schema'
import { getCurrentGameName, getOrCreateGame, updateGameDeathCount } from '../utils'

export const handleDeathsSet: CommandHandler<typeof DeathsSetArgs> = async (ctx, { count, counter: counterName }) => {
	const gameName = await getCurrentGameName()
	const gameData = await getOrCreateGame(gameName)

	const { game, targetCounter, totalDeaths } = await updateGameDeathCount(gameName, count, {
		counterName: counterName || gameData.activeCounter.name,
	})

	const isDefaultCounter = targetCounter.name.toLowerCase() === 'default'
	const counterSuffix = isDefaultCounter ? '' : ` [${targetCounter.name}]`
	const totalSuffix = gameData.counters.length > 1 || (!isDefaultCounter) ? ` (Total: ${totalDeaths})` : ''

	ctx.reply('deaths.set', {
		game: game.name,
		counter: targetCounter.name,
		counter_suffix: counterSuffix,
		count: targetCounter.deaths,
		total: totalDeaths,
		total_suffix: totalSuffix,
	})
}
