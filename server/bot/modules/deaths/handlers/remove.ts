import type { CommandHandler } from '~~/server/bot/core/types'
import type { DeathsAmountArgs } from '../schema'
import { getCurrentGameName, getOrCreateGame, updateGameDeathCount } from '../utils'

export const handleDeathsRemove: CommandHandler<typeof DeathsAmountArgs> = async (ctx, { amount = 1, counter: counterName }) => {
	const gameName = await getCurrentGameName()
	const gameData = await getOrCreateGame(gameName)

	let currentDeaths = gameData.activeCounter.deaths
	if (counterName) {
		const found = gameData.counters.find(c => c.name.toLowerCase() === counterName.toLowerCase())
		if (found) {
			currentDeaths = found.deaths
		}
		else {
			ctx.reply('deaths.counter-not-found', {
				game: gameData.game.name,
				counter: counterName,
			})
			return
		}
	}

	const newCount = Math.max(0, currentDeaths - amount)
	const { game, targetCounter, totalDeaths } = await updateGameDeathCount(gameName, newCount, {
		counterName: counterName || gameData.activeCounter.name,
	})

	const isDefaultCounter = targetCounter.name.toLowerCase() === 'default'
	const counterSuffix = isDefaultCounter ? '' : ` [${targetCounter.name}]`
	const totalSuffix = gameData.counters.length > 1 || (!isDefaultCounter) ? ` (Total: ${totalDeaths})` : ''

	ctx.reply('deaths.remove', {
		amount,
		game: game.name,
		counter: targetCounter.name,
		counter_suffix: counterSuffix,
		count: targetCounter.deaths,
		total: totalDeaths,
		total_suffix: totalSuffix,
	})
}
