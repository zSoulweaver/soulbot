import { eventSubManager } from '~~/server/bot/core/eventsub'
import { createTemplateContext, renderCustomTemplate } from '~~/server/bot/core/variables-engine'
import { sendRawChatMessage } from '~~/server/utils/chat'
import { sendDiscordMessage } from '~~/server/utils/discord'
import { logTwitchEvent } from '~~/server/utils/events-log'
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

async function renderAndPostDiscordAlert(
	enabled: boolean,
	channelId: string | undefined,
	template: string | undefined,
	eventUser: { id: string, name: string, displayName: string },
	extraVars?: Record<string, string | number>,
	logContext?: Record<string, any>,
) {
	if (!enabled || !channelId || !template) {
		return
	}

	// Defer alert rendering slightly to let other EventSub handlers (e.g. points module) complete their async database writes
	await new Promise(resolve => setTimeout(resolve, 10))

	const channel = (await getStreamerChannelName()) || 'streamer'
	const ctx = createTemplateContext(channel, eventUser)
	const rendered = await renderCustomTemplate(template, ctx, extraVars)
	botLogger.info({ ...logContext, message: rendered }, '[Discord Alerts] Posting alert')
	await sendDiscordMessage(channelId, rendered)
}

export function registerAlertsEventSubHandlers() {
	eventSubManager.events.on('follow', async (event) => {
		try {
			await logTwitchEvent('follow', event.userName, event.userDisplayName)
			const settings = await getAppSettings()
			await renderAndPostAlert(
				settings.eventsubAlertFollowEnabled,
				settings.eventsubAlertFollow,
				{ id: event.userId, name: event.userName, displayName: event.userDisplayName },
				undefined,
				{ user: event.userName, type: 'follow' },
			)
			await renderAndPostDiscordAlert(
				settings.discordAlertFollowEnabled,
				settings.discordAlertFollowChannelId,
				settings.discordAlertFollowTemplate,
				{ id: event.userId, name: event.userName, displayName: event.userDisplayName },
				undefined,
				{ user: event.userName, type: 'discord-follow' },
			)
		}
		catch (err) {
			botLogger.error({ err }, '[EventSub Alerts] Failed to handle follow alert')
		}
	})

	eventSubManager.events.on('subscription', async (event) => {
		try {
			await logTwitchEvent('subscription', event.userName, event.userDisplayName, { tier: event.tier })
			const settings = await getAppSettings()
			await renderAndPostAlert(
				settings.eventsubAlertSubEnabled,
				settings.eventsubAlertSub,
				{ id: event.userId, name: event.userName, displayName: event.userDisplayName },
				{ subTier: event.tier },
				{ user: event.userName, type: 'subscription' },
			)
			await renderAndPostDiscordAlert(
				settings.discordAlertSubEnabled,
				settings.discordAlertSubChannelId,
				settings.discordAlertSubTemplate,
				{ id: event.userId, name: event.userName, displayName: event.userDisplayName },
				{ subTier: event.tier },
				{ user: event.userName, type: 'discord-subscription' },
			)
		}
		catch (err) {
			botLogger.error({ err }, '[EventSub Alerts] Failed to handle subscription alert')
		}
	})

	eventSubManager.events.on('subscription.gift', async (event) => {
		try {
			await logTwitchEvent('gift', event.gifterName || 'anonymous', event.gifterDisplayName || 'Anonymous', { giftCount: event.amount })
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
			await renderAndPostDiscordAlert(
				settings.discordAlertGiftEnabled,
				settings.discordAlertGiftChannelId,
				settings.discordAlertGiftTemplate,
				{
					id: event.gifterId || 'anonymous',
					name: event.gifterName || 'anonymous',
					displayName: event.gifterDisplayName || 'Anonymous',
				},
				{ giftCount: event.amount },
				{ gifter: event.gifterName || 'anonymous', type: 'discord-subscription.gift' },
			)
		}
		catch (err) {
			botLogger.error({ err }, '[EventSub Alerts] Failed to handle sub-gift alert')
		}
	})

	eventSubManager.events.on('cheer', async (event) => {
		try {
			await logTwitchEvent('cheer', event.userName || 'anonymous', event.userDisplayName || 'Anonymous', {
				bitsCount: event.bits,
				cheerMessage: event.message,
			})
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
			await renderAndPostDiscordAlert(
				settings.discordAlertCheerEnabled,
				settings.discordAlertCheerChannelId,
				settings.discordAlertCheerTemplate,
				{
					id: event.userId || 'anonymous',
					name: event.userName || 'anonymous',
					displayName: event.userDisplayName || 'Anonymous',
				},
				{
					bitsCount: event.bits,
					cheerMessage: event.message,
				},
				{ user: event.userName || 'anonymous', bits: event.bits, type: 'discord-cheer' },
			)
		}
		catch (err) {
			botLogger.error({ err }, '[EventSub Alerts] Failed to handle cheer alert')
		}
	})
}
