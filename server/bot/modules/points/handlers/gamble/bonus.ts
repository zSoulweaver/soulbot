import type { CommandHandler } from '~~/server/bot/core/types'
import { templateRegistry } from '~~/server/bot/core/templates'
import { renderCustomTemplate } from '~~/server/bot/core/variables-engine'
import { gamblingSettings } from '~~/server/settings'

export const handleGambleBonus: CommandHandler = async (ctx) => {
	const settings = gamblingSettings.get()
	const now = Date.now()

	// Prevent starting a new bonus event if one is already active
	if (Number(settings.bonusEndTime) > now) {
		return ctx.reply('A gambling bonus event is already active!')
	}

	const duration = settings.bonusDuration
	const multiplier = settings.bonusWinMultiplier
	const threshold = settings.bonusWinMinRoll
	const bonusMessage = templateRegistry.get('gambling.bonus_start')?.template || ''
	const endTime = now + duration * 60 * 1000

	// Persist the end time to the database settings and memory cache
	await gamblingSettings.update({ bonusEndTime: endTime })

	// Schedule the natural expiration timer
	const { scheduleBonusEnd } = await import('~~/server/bot/modules/points/bonus-manager')
	await scheduleBonusEnd(endTime)

	const tickets = settings.bonusTicketsPerUser

	// Render customizable start message
	const rendered = await renderCustomTemplate(bonusMessage, ctx, {
		multiplier,
		threshold,
		duration,
		tickets,
	})

	// Broadcast start message to Twitch chat
	await ctx.say(rendered)
}
