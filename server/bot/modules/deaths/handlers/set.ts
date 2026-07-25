import type { CommandHandler } from '~~/server/bot/core/types'
import type { DeathsSetArgs } from '../schema'
import { getCurrentGameName, updateGameDeathCount } from '../utils'

export const handleDeathsSet: CommandHandler<typeof DeathsSetArgs> = async (ctx, [count]) => {
	const gameName = await getCurrentGameName()
	const updated = await updateGameDeathCount(gameName, count)

	ctx.reply('deaths.set', {
		game: updated.gameName,
		count: updated.deaths,
	})
}
