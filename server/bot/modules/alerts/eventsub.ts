import { eventSubManager } from '~~/server/bot/core/eventsub'
import { createTemplateContext, renderCustomTemplate } from '~~/server/bot/core/variables-engine'
import { sendRawChatMessage } from '~~/server/utils/chat'
import { botLogger } from '~~/server/utils/logger'
import { getAppSettings } from '~~/server/utils/settings'
import { getStreamerChannelName } from '~~/server/utils/twurple'

async function postAlertToChat(message: string) {
	const channelName = await getStreamerChannelName()
	if (channelName) {
		await sendRawChatMessage(channelName, message)
	}
}

async function renderAndPostAlert(
	enabled: boolean,
	template: string | undefined,
	eventUser: { id: string, name: string, displayName: string },
	extraVars?: Record<string, string | number>,
	logContext?: Record<string, any>,
) {
	if (!enabled || !template) {
		return
	}

	// Defer alert rendering slightly to let other EventSub handlers (e.g. points module) complete their async database writes
	await new Promise(resolve => setTimeout(resolve, 10))

	const channel = (await getStreamerChannelName()) || 'streamer'
	const ctx = createTemplateContext(channel, eventUser)
	const rendered = await renderCustomTemplate(template, ctx, extraVars)
	botLogger.info({ ...logContext, message: rendered }, '[EventSub Alerts] Posting alert')
	await postAlertToChat(rendered)
}

export function registerAlertsEventSubHandlers() {
	eventSubManager.events.on('follow', async (event) => {
		try {
			const settings = await getAppSettings()
			await renderAndPostAlert(
				settings.eventsubAlertFollowEnabled,
				settings.eventsubAlertFollow,
				{ id: event.userId, name: event.userName, displayName: event.userDisplayName },
				undefined,
				{ user: event.userName, type: 'follow' },
			)
		}
		catch (err) {
			botLogger.error({ err }, '[EventSub Alerts] Failed to handle follow alert')
		}
	})

	eventSubManager.events.on('subscription', async (event) => {
		try {
			const settings = await getAppSettings()
			await renderAndPostAlert(
				settings.eventsubAlertSubEnabled,
				settings.eventsubAlertSub,
				{ id: event.userId, name: event.userName, displayName: event.userDisplayName },
				{ subTier: event.tier },
				{ user: event.userName, type: 'subscription' },
			)
		}
		catch (err) {
			botLogger.error({ err }, '[EventSub Alerts] Failed to handle subscription alert')
		}
	})

	eventSubManager.events.on('subscription.gift', async (event) => {
		try {
			const settings = await getAppSettings()
			await renderAndPostAlert(
				settings.eventsubAlertGiftEnabled,
				settings.eventsubAlertGift,
				{
					id: event.gifterId || 'anonymous',
					name: event.gifterName || 'anonymous',
					displayName: event.gifterDisplayName || 'Anonymous',
				},
				{ giftCount: event.amount },
				{ gifter: event.gifterName || 'anonymous', type: 'subscription.gift' },
			)
		}
		catch (err) {
			botLogger.error({ err }, '[EventSub Alerts] Failed to handle sub-gift alert')
		}
	})

	eventSubManager.events.on('cheer', async (event) => {
		try {
			const settings = await getAppSettings()
			await renderAndPostAlert(
				settings.eventsubAlertCheerEnabled,
				settings.eventsubAlertCheer,
				{
					id: event.userId || 'anonymous',
					name: event.userName || 'anonymous',
					displayName: event.userDisplayName || 'Anonymous',
				},
				{
					bitsCount: event.bits,
					cheerMessage: event.message,
				},
				{ user: event.userName || 'anonymous', bits: event.bits, type: 'cheer' },
			)
		}
		catch (err) {
			botLogger.error({ err }, '[EventSub Alerts] Failed to handle cheer alert')
		}
	})
}
