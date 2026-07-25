import type { CommandHandler } from '~~/server/bot/core/types'
import type { DeathsAmountArgs } from '../schema'
import { getCurrentGameName, getOrCreateGameDeathRecord, updateGameDeathCount } from '../utils'

export const handleDeathsAdd: CommandHandler<typeof DeathsAmountArgs> = async (ctx, [amount = 1]) => {
	const gameName = await getCurrentGameName()
	const currentRecord = await getOrCreateGameDeathRecord(gameName)
	const newCount = currentRecord.deaths + amount
	const updated = await updateGameDeathCount(gameName, newCount)

	ctx.reply('deaths.add', {
		amount,
		game: updated.gameName,
		count: updated.deaths,
	})
}
