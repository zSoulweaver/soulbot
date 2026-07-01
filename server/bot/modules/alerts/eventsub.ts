import { eventSubManager } from '~~/server/bot/core/eventsub'
import { createTemplateContext, renderCustomTemplate } from '~~/server/bot/core/variables-engine'
import { sendRawChatMessage } from '~~/server/utils/chat'
import { deleteDiscordMessage, sendDiscordMessage } from '~~/server/utils/discord'
import { logTwitchEvent } from '~~/server/utils/events-log'
import { botLogger } from '~~/server/utils/logger'
import { getAppSettings, updateAppSetting } from '~~/server/utils/settings'
import { getApiClient, getStreamerChannelName } from '~~/server/utils/twurple'

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

	eventSubManager.events.on('raid', async (event) => {
		try {
			await logTwitchEvent('raid', event.raidingBroadcasterName, event.raidingBroadcasterDisplayName, { raidSize: event.viewers })
			const settings = await getAppSettings()
			await renderAndPostAlert(
				settings.eventsubAlertRaidEnabled,
				settings.eventsubAlertRaid,
				{ id: event.raidingBroadcasterId, name: event.raidingBroadcasterName, displayName: event.raidingBroadcasterDisplayName },
				{ raidSize: event.viewers },
				{ raider: event.raidingBroadcasterName, viewers: event.viewers, type: 'raid' },
			)
			await renderAndPostDiscordAlert(
				settings.discordAlertRaidEnabled,
				settings.discordAlertRaidChannelId,
				settings.discordAlertRaidTemplate,
				{ id: event.raidingBroadcasterId, name: event.raidingBroadcasterName, displayName: event.raidingBroadcasterDisplayName },
				{ raidSize: event.viewers },
				{ raider: event.raidingBroadcasterName, viewers: event.viewers, type: 'discord-raid' },
			)
		}
		catch (err) {
			botLogger.error({ err }, '[EventSub Alerts] Failed to handle raid alert')
		}
	})

	eventSubManager.events.on('stream.online', async (event) => {
		try {
			await logTwitchEvent('live', event.broadcasterName, event.broadcasterDisplayName)
			const settings = await getAppSettings()

			let channelInfo: any = null
			let broadcasterInfo: any = null
			try {
				const api = getApiClient()
				channelInfo = await api.channels.getChannelInfoById(event.broadcasterId)
				broadcasterInfo = await api.users.getUserById(event.broadcasterId)
			}
			catch (apiErr) {
				botLogger.error({ apiErr }, '[EventSub Alerts] Failed to fetch live metadata from Helix')
			}

			// 1. Post to Twitch Chat
			await renderAndPostAlert(
				settings.eventsubAlertLiveEnabled,
				settings.eventsubAlertLive,
				{ id: event.broadcasterId, name: event.broadcasterName, displayName: event.broadcasterDisplayName },
				{
					liveGame: channelInfo?.gameName || 'Just Chatting',
					liveTitle: channelInfo?.title || 'No Title',
				},
				{ user: event.broadcasterName, type: 'live' },
			)

			// 2. Post to Discord with Embed
			if (settings.discordAlertLiveEnabled && settings.discordAlertLiveChannelId) {
				const channel = (await getStreamerChannelName()) || 'streamer'
				const eventUser = { id: event.broadcasterId, name: event.broadcasterName, displayName: event.broadcasterDisplayName }
				const ctx = createTemplateContext(channel, eventUser)
				const renderedMessage = await renderCustomTemplate(settings.discordAlertLiveTemplate || '@everyone $(sender) is now live on Twitch!', ctx)

				const embed = {
					title: `${event.broadcasterDisplayName} just went online on Twitch!`,
					url: `https://twitch.tv/${event.broadcasterName}`,
					thumbnailUrl: broadcasterInfo?.profilePictureUrl || undefined,
					fields: [
						{ name: 'Now Playing', value: channelInfo?.gameName || 'Just Chatting', inline: true },
						{ name: 'Stream Status', value: channelInfo?.title || 'No Title', inline: true },
					],
					imageUrl: `https://static-cdn.jtvnw.net/previews-ttv/live_user_${event.broadcasterName}-640x360.jpg?t=${Date.now()}`,
					footerText: 'Twitch',
					footerIconUrl: 'https://static.twitchcdn.net/assets/favicon-32x32-e29e54a2305db3de7191.png',
					timestamp: true,
				}

				botLogger.info({ type: 'discord-live', user: event.broadcasterName }, '[Discord Alerts] Posting live embed alert')
				const sentMessage = await sendDiscordMessage(settings.discordAlertLiveChannelId, renderedMessage, embed)

				if (sentMessage && settings.discordAlertLiveRemoveOffline) {
					await updateAppSetting('discord.alerts.live.last_message_id', sentMessage.id)
					await updateAppSetting('discord.alerts.live.last_channel_id', sentMessage.channelId)
				}
			}
		}
		catch (err) {
			botLogger.error({ err }, '[EventSub Alerts] Failed to handle live alert')
		}
	})

	eventSubManager.events.on('stream.offline', async (event) => {
		try {
			await logTwitchEvent('offline', event.broadcasterName, event.broadcasterDisplayName)
			const settings = await getAppSettings()

			// 1. Post to Twitch Chat
			await renderAndPostAlert(
				settings.eventsubAlertOfflineEnabled,
				settings.eventsubAlertOffline,
				{ id: event.broadcasterId, name: event.broadcasterName, displayName: event.broadcasterDisplayName },
				undefined,
				{ user: event.broadcasterName, type: 'offline' },
			)

			// 2. Post to Discord
			await renderAndPostDiscordAlert(
				settings.discordAlertOfflineEnabled,
				settings.discordAlertOfflineChannelId,
				settings.discordAlertOfflineTemplate,
				{ id: event.broadcasterId, name: event.broadcasterName, displayName: event.broadcasterDisplayName },
				undefined,
				{ user: event.broadcasterName, type: 'discord-offline' },
			)

			// 3. Remove live notification if configured and exists
			if (settings.discordAlertLiveRemoveOffline) {
				const lastMessageId = settings.discordAlertLiveLastMessageId
				const lastChannelId = settings.discordAlertLiveLastChannelId
				if (lastMessageId && lastChannelId) {
					botLogger.info({ lastMessageId, lastChannelId }, '[Discord Alerts] Deleting stream.online announcement')
					await deleteDiscordMessage(lastChannelId, lastMessageId)
					await updateAppSetting('discord.alerts.live.last_message_id', '')
					await updateAppSetting('discord.alerts.live.last_channel_id', '')
				}
			}
		}
		catch (err) {
			botLogger.error({ err }, '[EventSub Alerts] Failed to handle offline alert')
		}
	})
}
