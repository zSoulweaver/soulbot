import type { CommandHandler } from '~~/server/bot/core/types'
import type { DeathsSelectArgs } from '../schema'
import { getCurrentGameName, setActiveDeathCounter } from '../utils'

export const handleDeathsSelect: CommandHandler<typeof DeathsSelectArgs> = async (ctx, counterName) => {
	const gameName = await getCurrentGameName()
	const { game, activeCounter, totalDeaths } = await setActiveDeathCounter(gameName, counterName)

	ctx.reply('deaths.select', {
		game: game.name,
		counter: activeCounter.name,
		count: activeCounter.deaths,
		total: totalDeaths,
	})
}
