import type { CommandHandler } from '~~/server/bot/core/types'
import type { VaultArgs } from '../../schema'
import { cleanUsername } from '~~/server/bot/core/utils'
import { vaultSettings } from '~~/server/settings'
import { getUserPoints } from '../../service'
import { isVaultActive, joinVaultRaid } from '../../vault-manager'

export const handleVaultRoot: CommandHandler<typeof VaultArgs> = async (ctx, [amountStr]) => {
	if (!isVaultActive()) {
		return ctx.reply('points.vault.not-active')
	}

	const username = cleanUsername(ctx.user.name)
	const lowerInput = amountStr.trim().toLowerCase()

	// Handle opt-out
	if (lowerInput === '0') {
		const result = await joinVaultRaid({ id: ctx.user.id, username, displayName: ctx.user.displayName }, 0)
		if (result.action === 'opt-out') {
			return ctx.reply('points.vault.opt-out', { sender: ctx.user.displayName })
		}
		return ctx.reply('points.vault.not-joined', { sender: ctx.user.displayName })
	}

	const currentPoints = await getUserPoints(username)
	if (currentPoints === null || currentPoints <= 0) {
		return ctx.reply('points.user-no-points-self')
	}

	const settings = vaultSettings.get()
	const minBet = settings.minBet
	const maxBet = settings.maxBet

	let betAmount = 0
	if (lowerInput === 'all') {
		betAmount = currentPoints
	}
	else if (lowerInput === 'half') {
		betAmount = Math.floor(currentPoints / 2)
	}
	else {
		const parsed = Number(amountStr)
		if (Number.isNaN(parsed) || !Number.isInteger(parsed) || parsed < 0) {
			return ctx.reply('points.vault.invalid-amount')
		}
		betAmount = parsed
	}

	if (betAmount < minBet) {
		return ctx.reply('points.vault.min-bet', { minBet })
	}

	if (betAmount > maxBet) {
		return ctx.reply('points.vault.max-bet', { maxBet })
	}

	if (betAmount > currentPoints) {
		return ctx.reply('points.vault.not-enough-points', { current: currentPoints, bet: betAmount })
	}

	const result = await joinVaultRaid({ id: ctx.user.id, username, displayName: ctx.user.displayName }, betAmount)

	if (result.action === 'not-enough-points') {
		return ctx.reply('points.vault.not-enough-points', { current: result.currentPoints ?? currentPoints, bet: betAmount })
	}

	const potentialWin = Math.floor(betAmount * settings.winMultiplier)

	if (result.action === 'updated') {
		return ctx.reply('points.vault.updated', {
			sender: ctx.user.displayName,
			betAmount,
			potentialWin,
		})
	}

	return ctx.reply('points.vault.joined', {
		sender: ctx.user.displayName,
		betAmount,
		potentialWin,
	})
}
