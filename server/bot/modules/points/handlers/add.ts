import type { CommandHandler } from '~~/server/bot/core/types'
import type { PointsAddArgs } from '../schema'
import { updateUserPoints } from '../service'

export const handlePointsAdd: CommandHandler<typeof PointsAddArgs> = async (ctx, [target, amount]) => {
	const username = target.toLowerCase().replace('@', '')

	const dbUser = await updateUserPoints(username, amount, 'add')

	if (!dbUser) {
		return ctx.reply('points.user-does-not-exist', { target })
	}

	ctx.reply('points.add', {
		amount,
		target: dbUser.displayName,
		newAmount: dbUser.points,
	})
}
