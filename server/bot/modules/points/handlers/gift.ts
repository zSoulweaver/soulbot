import type { CommandHandler } from '~~/server/bot/core/types'
import type { PointsGiftArgs } from '../schema'
import { cleanUsername } from '~~/server/bot/core/utils'
import { transferPoints } from '../service'

export const handlePointsGift: CommandHandler<typeof PointsGiftArgs> = async (ctx, [target, amount]) => {
	const senderUsername = cleanUsername(ctx.user.name)
	const targetUsername = cleanUsername(target)

	if (senderUsername === targetUsername) {
		return ctx.reply('points.gift.self')
	}

	const result = await transferPoints(senderUsername, targetUsername, amount)

	if (!result.success) {
		if (result.error === 'target-not-found') {
			return ctx.reply('points.user-does-not-exist', { target })
		}
		if (result.error === 'not-enough-points') {
			return ctx.reply('points.gift.not-enough-points', {
				current: result.senderPoints,
				amount,
			})
		}
		// Fallback for any other error
		return ctx.reply('points.user-not-found', { target })
	}

	ctx.reply('points.gift.success', {
		amount,
		target: result.target.displayName,
		senderPoints: result.sender.points,
		targetPoints: result.target.points,
	})
}
