import type { CommandHandler } from '~~/server/bot/core/types'
import type { DeathsResetArgs } from '../schema'
import { getCurrentGameName, getOrCreateGame, updateGameDeathCount } from '../utils'

export const handleDeathsReset: CommandHandler<typeof DeathsResetArgs> = async (ctx, counterName) => {
	const gameName = await getCurrentGameName()
	const gameData = await getOrCreateGame(gameName)

	if (counterName) {
		const found = gameData.counters.find(c => c.name.toLowerCase() === counterName.toLowerCase())
		if (!found) {
			ctx.reply('deaths.counter-not-found', {
				game: gameData.game.name,
				counter: counterName,
			})
			return
		}
	}

	const { game, targetCounter, totalDeaths } = await updateGameDeathCount(gameName, 0, {
		counterName: counterName || gameData.activeCounter.name,
	})

	const isDefaultCounter = targetCounter.name.toLowerCase() === 'default'
	const counterSuffix = isDefaultCounter ? '' : ` [${targetCounter.name}]`
	const totalSuffix = gameData.counters.length > 1 || (!isDefaultCounter) ? ` (Total: ${totalDeaths})` : ''

	ctx.reply('deaths.reset', {
		game: game.name,
		counter: targetCounter.name,
		counter_suffix: counterSuffix,
		total: totalDeaths,
		total_suffix: totalSuffix,
	})
}
