import { createTemplateContext, renderCustomTemplate } from '~~/server/bot/core/variables-engine'
import { gamblingSettings } from '~~/server/settings'
import { requireUserRole } from '~~/server/utils/auth'
import { sendRawChatMessage } from '~~/server/utils/chat'
import { getStreamerChannelName } from '~~/server/utils/twurple'

export default defineEventHandler(async (event) => {
	// Allow moderators and casters to trigger the bonus event
	await requireUserRole(event, 'moderator')

	const settings = gamblingSettings.get()
	const now = Date.now()

	// Prevent starting a new bonus event if one is already active
	if (Number(settings.bonusEndTime) > now) {
		throw createError({
			statusCode: 400,
			statusMessage: 'A gambling bonus event is already active.',
		})
	}

	const duration = settings.bonusDuration
	const multiplier = settings.bonusWinMultiplier
	const threshold = settings.bonusWinMinRoll
	const bonusMessage = settings.bonusMessage
	const endTime = now + duration * 60 * 1000

	// Persist the end time to the database settings and memory cache
	await gamblingSettings.update({ bonusEndTime: endTime })

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
			tickets: settings.bonusTicketsPerUser,
		})
		await sendRawChatMessage(channel, rendered)
	}

	return { success: true, endTime }
})
