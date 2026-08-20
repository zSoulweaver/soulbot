import type { CommandHandler } from '~~/server/bot/core/types'
import type { DeathsRenameArgs } from '../schema'
import { getCurrentGameName, renameDeathCounter } from '../utils'

export const handleDeathsRename: CommandHandler<typeof DeathsRenameArgs> = async (ctx, { oldName, newName }) => {
	const gameName = await getCurrentGameName()
	const result = await renameDeathCounter(gameName, oldName, newName)

	if (!result.success) {
		ctx.reply('deaths.counter-not-found', {
			game: result.game.name,
			counter: oldName,
		})
		return
	}

	ctx.reply('deaths.rename', {
		game: result.game.name,
		old: oldName,
		new: newName,
	})
}
