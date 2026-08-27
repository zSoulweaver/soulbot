import { createTemplateContext, renderCustomTemplate } from '~~/server/bot/core/variables-engine'
import { requireUserRole } from '~~/server/utils/auth'
import { sendRawChatMessage } from '~~/server/utils/chat'
import { getAppSettings, refreshAppSettingsCache, updateAppSetting } from '~~/server/utils/settings'
import { getStreamerChannelName } from '~~/server/utils/twurple'

export default defineEventHandler(async (event) => {
	// Allow moderators and casters to trigger the bonus event
	await requireUserRole(event, 'moderator')

	const settings = await getAppSettings()
	const now = Date.now()

	// Prevent starting a new bonus event if one is already active
	if (Number(settings.pointsGamblingBonusEndTime) > now) {
		throw createError({
			statusCode: 400,
			statusMessage: 'A gambling bonus event is already active.',
		})
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

	// Broadcast start message to Twitch chat
	const channel = await getStreamerChannelName()
	if (channel) {
		const ctx = createTemplateContext(channel)
		const rendered = await renderCustomTemplate(bonusMessage, ctx, {
			multiplier,
			threshold,
			duration,
			tickets: settings.pointsGamblingBonusTicketsPerUser,
		})
		await sendRawChatMessage(channel, rendered)
	}

	return { success: true, endTime }
})
