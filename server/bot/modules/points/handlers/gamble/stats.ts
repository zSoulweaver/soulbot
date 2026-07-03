import type { CommandHandler } from '~~/server/bot/core/types'
import type { GambleStatsArgs } from '../../schema'
import { cleanUsername } from '~~/server/bot/core/utils'
import { getUserRecord } from '~~/server/bot/services/user'

export const handleGambleStats: CommandHandler<typeof GambleStatsArgs> = async (ctx, [target]) => {
	const username = cleanUsername(target || ctx.user.name)
	const dbUser = await getUserRecord(username)

	if (!dbUser) {
		if (target) {
			return ctx.reply('points.user-not-found', { target: username })
		}
		return ctx.reply('points.user-no-points-self')
	}

	if (target) {
		return ctx.reply('points.gambling.stats', {
			target: dbUser.displayName,
			wins: dbUser.gambleWins,
			losses: dbUser.gambleLosses,
			netAmount: dbUser.gambleNetPoints,
		})
	}

	ctx.reply('points.gambling.stats-self', {
		wins: dbUser.gambleWins,
		losses: dbUser.gambleLosses,
		netAmount: dbUser.gambleNetPoints,
	})
}
