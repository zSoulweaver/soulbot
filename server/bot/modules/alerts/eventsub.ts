import { eventSubManager } from '~~/server/bot/core/eventsub'
import { createTemplateContext, renderCustomTemplate } from '~~/server/bot/core/variables-engine'
import { db } from '~~/server/database'
import { twitchTokens } from '~~/server/database/schema'
import { botLogger } from '~~/server/utils/logger'
import { getAppSettings } from '~~/server/utils/settings'
import { getChatClient } from '~~/server/utils/twurple'

/**
 * Sends a raw message to the broadcaster's Twitch channel chat
 */
async function postAlertToChat(message: string) {
	const chat = await getChatClient()
	if (!chat || !chat.isConnected) {
		botLogger.warn('[EventSub Alerts] Chat client not connected, skipping alert message.')
		return
	}

	const tokens = await db.select().from(twitchTokens)
	const streamerToken = tokens.find(t => t.accountType === 'streamer')
	if (streamerToken && streamerToken.userName) {
		await chat.say(streamerToken.userName, message)
	}
}

export function registerAlertsEventSubHandlers() {
	// Retrieve the channel name from the database once or dynamically inside the emitter
	const getChannelName = async (): Promise<string> => {
		const tokens = await db.select().from(twitchTokens)
		const streamer = tokens.find(t => t.accountType === 'streamer')
		return streamer?.userName || 'streamer'
	}

	// Follow alerts
	eventSubManager.events.on('follow', async (event) => {
		try {
			// Settle delay for database transactions
			await new Promise(resolve => setTimeout(resolve, 20))

			const settings = await getAppSettings()
			if (!settings.eventsubAlertFollowEnabled || !settings.eventsubAlertFollow) {
				return
			}

			const channel = await getChannelName()
			const ctx = createTemplateContext(
				channel,
				{ id: event.userId, name: event.userName, displayName: event.userDisplayName },
			)

			const rendered = await renderCustomTemplate(settings.eventsubAlertFollow, ctx)
			botLogger.info({ user: event.userName, message: rendered }, '[EventSub Alerts] Posting follow alert')
			await postAlertToChat(rendered)
		}
		catch (err) {
			botLogger.error({ err }, '[EventSub Alerts] Failed to handle follow alert')
		}
	})

	// Subscription alerts
	eventSubManager.events.on('subscription', async (event) => {
		try {
			await new Promise(resolve => setTimeout(resolve, 20))

			const settings = await getAppSettings()
			if (!settings.eventsubAlertSubEnabled || !settings.eventsubAlertSub) {
				return
			}

			const channel = await getChannelName()
			const ctx = createTemplateContext(
				channel,
				{ id: event.userId, name: event.userName, displayName: event.userDisplayName },
			)

			const rendered = await renderCustomTemplate(settings.eventsubAlertSub, ctx, {
				subTier: event.tier,
			})
			botLogger.info({ user: event.userName, message: rendered }, '[EventSub Alerts] Posting subscription alert')
			await postAlertToChat(rendered)
		}
		catch (err) {
			botLogger.error({ err }, '[EventSub Alerts] Failed to handle subscription alert')
		}
	})

	// Subscription Gift alerts
	eventSubManager.events.on('subscription.gift', async (event) => {
		try {
			await new Promise(resolve => setTimeout(resolve, 20))

			const settings = await getAppSettings()
			if (!settings.eventsubAlertGiftEnabled || !settings.eventsubAlertGift) {
				return
			}

			const channel = await getChannelName()
			const ctx = createTemplateContext(
				channel,
				{
					id: event.gifterId || 'anonymous',
					name: event.gifterName || 'anonymous',
					displayName: event.gifterDisplayName || 'Anonymous',
				},
			)

			const rendered = await renderCustomTemplate(settings.eventsubAlertGift, ctx, {
				giftCount: event.amount,
			})
			botLogger.info({ gifter: event.gifterName || 'anonymous', message: rendered }, '[EventSub Alerts] Posting subscription gift alert')
			await postAlertToChat(rendered)
		}
		catch (err) {
			botLogger.error({ err }, '[EventSub Alerts] Failed to handle sub-gift alert')
		}
	})

	// Cheer / Bits alerts
	eventSubManager.events.on('cheer', async (event) => {
		try {
			await new Promise(resolve => setTimeout(resolve, 20))

			const settings = await getAppSettings()
			if (!settings.eventsubAlertCheerEnabled || !settings.eventsubAlertCheer) {
				return
			}

			const channel = await getChannelName()
			const ctx = createTemplateContext(
				channel,
				{
					id: event.userId || 'anonymous',
					name: event.userName || 'anonymous',
					displayName: event.userDisplayName || 'Anonymous',
				},
			)

			const rendered = await renderCustomTemplate(settings.eventsubAlertCheer, ctx, {
				bitsCount: event.bits,
				cheerMessage: event.message,
			})
			botLogger.info({ user: event.userName || 'anonymous', bits: event.bits, message: rendered }, '[EventSub Alerts] Posting cheer alert')
			await postAlertToChat(rendered)
		}
		catch (err) {
			botLogger.error({ err }, '[EventSub Alerts] Failed to handle cheer alert')
		}
	})
}
