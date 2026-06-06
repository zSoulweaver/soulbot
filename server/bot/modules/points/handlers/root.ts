import type { CommandHandler } from '~~/server/bot/core/types'
import type { PointsArgs } from '../schema'
import { cleanUsername } from '~~/server/bot/core/utils'
import { getUserRecord } from '~~/server/bot/services/user'

export const handlePointsRoot: CommandHandler<typeof PointsArgs> = async (ctx, [target]) => {
	const username = cleanUsername(target || ctx.user.name)
	const dbUser = await getUserRecord(username)

	if (!dbUser) {
		if (target) {
			return ctx.reply('points.user-no-points', { target: username })
		}
		return ctx.reply('points.user-no-points-self')
	}

	if (target) {
		return ctx.reply('points.show', {
			target: username,
			amount: dbUser.points,
		})
	}

	ctx.reply('points.show-self', {
		amount: dbUser.points,
	})
}
