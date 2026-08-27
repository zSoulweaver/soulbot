import type { CommandHandler } from '~~/server/bot/core/types'
import { renderCustomTemplate } from '~~/server/bot/core/variables-engine'
import { getAppSettings, refreshAppSettingsCache, updateAppSetting } from '~~/server/utils/settings'

export const handleGambleBonus: CommandHandler = async (ctx) => {
	const settings = await getAppSettings()
	const now = Date.now()

	// Prevent starting a new bonus event if one is already active
	if (Number(settings.pointsGamblingBonusEndTime) > now) {
		return ctx.reply('A gambling bonus event is already active!')
	}

	const duration = settings.pointsGamblingBonusDuration
	const multiplier = settings.pointsGamblingBonusWinMultiplier
	const threshold = settings.pointsGamblingBonusWinMinRoll
	const bonusMessage = settings.pointsGamblingBonusMessage
	const endTime = now + duration * 60 * 1000

	// Persist the end time to the database settings
	await updateAppSetting('points.gambling_bonus_end_time', String(endTime))

	// Refresh the cache
	await refreshAppSettingsCache()

	// Schedule the natural expiration timer
	const { scheduleBonusEnd } = await import('~~/server/bot/modules/points/bonus-manager')
	await scheduleBonusEnd(endTime)

	const tickets = settings.pointsGamblingBonusTicketsPerUser

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
