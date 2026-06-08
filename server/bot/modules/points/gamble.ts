import { z } from 'zod'
import { cleanUsername } from '~~/server/bot/core/utils'
import { getAppSettingsSync } from '~~/server/utils/settings'
import { defineCommand } from '../../core/define-command'
import { getUserPoints, updateUserPoints } from './service'

export const gambleModule = defineCommand({
	id: 'gamble',
	description: 'Gamble your points',
	usage: '!gamble <amount|all|half>',
	permission: 'everyone',
	args: z.tuple([z.string().describe('amount')]),
	templates: [
		'points.gambling.win',
		'points.gambling.lose',
		'points.gambling.min-bet',
		'points.gambling.max-bet',
		'points.gambling.not-enough-points',
		'points.gambling.invalid-amount',
		'points.user-no-points-self',
	],
	handler: async (ctx, [amountStr]) => {
		const username = cleanUsername(ctx.user.name)
		const currentPoints = await getUserPoints(username)

		if (currentPoints === null || currentPoints <= 0) {
			return ctx.reply('points.user-no-points-self')
		}

		const settings = getAppSettingsSync()
		const minBet = settings.pointsGamblingMinBet
		const maxBet = settings.pointsGamblingMaxBet

		let betAmount = 0
		const lowerInput = amountStr.toLowerCase()

		if (lowerInput === 'all') {
			betAmount = currentPoints
		}
		else if (lowerInput === 'half') {
			betAmount = Math.floor(currentPoints / 2)
		}
		else {
			const parsed = Number(amountStr)
			if (Number.isNaN(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
				return ctx.reply('points.gambling.invalid-amount')
			}
			betAmount = parsed
		}

		if (betAmount < minBet) {
			return ctx.reply('points.gambling.min-bet', { minBet })
		}

		if (betAmount > maxBet) {
			return ctx.reply('points.gambling.max-bet', { maxBet })
		}

		if (betAmount > currentPoints) {
			return ctx.reply('points.gambling.not-enough-points', { current: currentPoints, bet: betAmount })
		}

		// Roll between 1 and 100 inclusive
		const roll = Math.floor(Math.random() * 100) + 1
		const winMinRoll = settings.pointsGamblingWinMinRoll
		const winMultiplier = settings.pointsGamblingWinMultiplier

		if (roll >= winMinRoll) {
			const winAmount = Math.floor(betAmount * winMultiplier)
			const updated = await updateUserPoints(username, winAmount, 'add')
			const newAmount = updated?.points ?? (currentPoints + winAmount)
			return ctx.reply('points.gambling.win', {
				sender: ctx.user.displayName,
				roll,
				winAmount,
				oldAmount: currentPoints,
				newAmount,
			})
		}
		else {
			const updated = await updateUserPoints(username, -betAmount, 'add')
			const newAmount = updated?.points ?? (currentPoints - betAmount)
			return ctx.reply('points.gambling.lose', {
				sender: ctx.user.displayName,
				roll,
				betAmount,
				oldAmount: currentPoints,
				newAmount,
			})
		}
	},
})
