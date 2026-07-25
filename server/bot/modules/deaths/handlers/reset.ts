import type { CommandHandler } from '~~/server/bot/core/types'
import { getCurrentGameName, updateGameDeathCount } from '../utils'

export const handleDeathsReset: CommandHandler = async (ctx) => {
	const gameName = await getCurrentGameName()
	const updated = await updateGameDeathCount(gameName, 0)

	ctx.reply('deaths.reset', {
		game: updated.gameName,
	})
}
