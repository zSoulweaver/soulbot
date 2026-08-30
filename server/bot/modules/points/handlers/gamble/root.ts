import type { CommandHandler } from '~~/server/bot/core/types'
import type { GambleArgs } from '../../schema'
import { cleanUsername } from '~~/server/bot/core/utils'
import { gamblingSettings } from '~~/server/settings'
import { getBonusBetsUsed, incrementBonusBetsUsed } from '../../bonus-manager'
import { getUserPoints, updateUserPointsAndGambleStats } from '../../service'

export const handleGambleRoot: CommandHandler<typeof GambleArgs> = async (ctx, [amountStr]) => {
	const username = cleanUsername(ctx.user.name)
	const currentPoints = await getUserPoints(username)

	if (currentPoints === null || currentPoints <= 0) {
		return ctx.reply('points.user-no-points-self')
	}

	const settings = gamblingSettings.get()
	const minBet = settings.minBet
	const maxBet = settings.maxBet

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

	// Determine if this roll is eligible for a bonus ticket
	const isBonusActive = settings.bonusEndTime > Date.now()
	const maxBonusTickets = settings.bonusTicketsPerUser
	const usedBonusTickets = getBonusBetsUsed(username)
	const isBonusRoll = isBonusActive && usedBonusTickets < maxBonusTickets

	let ticketsRemaining = 0
	if (isBonusRoll) {
		const updatedCount = incrementBonusBetsUsed(username)
		ticketsRemaining = Math.max(0, maxBonusTickets - updatedCount)
	}

	// Roll between 1 and 100 inclusive
	const roll = Math.floor(Math.random() * 100) + 1
	const winMinRoll = isBonusRoll ? settings.bonusWinMinRoll : settings.winMinRoll
	const winMultiplier = isBonusRoll ? settings.bonusWinMultiplier : settings.winMultiplier

	if (roll >= winMinRoll) {
		const winAmount = Math.floor(betAmount * winMultiplier)
		const updated = await updateUserPointsAndGambleStats(username, winAmount, true)
		const newAmount = updated?.points ?? (currentPoints + winAmount)
		const template = isBonusRoll ? 'points.gambling.bonus-win' : 'points.gambling.win'
		return ctx.reply(template, {
			sender: ctx.user.displayName,
			roll,
			winAmount,
			oldAmount: currentPoints,
			newAmount,
			ticketsRemaining,
		})
	}
	else {
		const updated = await updateUserPointsAndGambleStats(username, -betAmount, false)
		const newAmount = updated?.points ?? (currentPoints - betAmount)
		const template = isBonusRoll ? 'points.gambling.bonus-lose' : 'points.gambling.lose'
		return ctx.reply(template, {
			sender: ctx.user.displayName,
			roll,
			betAmount,
			oldAmount: currentPoints,
			newAmount,
			ticketsRemaining,
		})
	}
}
