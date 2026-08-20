import type { CommandHandler } from '~~/server/bot/core/types'
import { getCurrentGameName, getOrCreateGame } from '../utils'

export const handleDeathsList: CommandHandler = async (ctx) => {
	const gameName = await getCurrentGameName()
	const data = await getOrCreateGame(gameName)

	const maxShow = 10
	const counterNames = data.counters.map((c) => {
		const isActive = c.id === data.game.activeDeathCounterId
		return isActive ? `${c.name} (Active)` : c.name
	})

	const visible = counterNames.slice(0, maxShow)
	const remaining = counterNames.length - maxShow
	let listText = visible.join(', ')
	if (remaining > 0) {
		listText += ` and ${remaining} more`
	}

	ctx.reply('deaths.list', {
		game: data.game.name,
		list: listText,
		total: data.totalDeaths,
	})
}
