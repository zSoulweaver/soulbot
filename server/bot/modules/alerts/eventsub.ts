import { getUserRecentMessages } from '~~/server/bot/core/chat-history'
import { eventSubManager } from '~~/server/bot/core/eventsub'
import { templateRegistry } from '~~/server/bot/core/templates'
import { createTemplateContext, renderCustomTemplate } from '~~/server/bot/core/variables-engine'
import { sendRawChatMessage } from '~~/server/utils/chat'
import { deleteDiscordMessage, sendDiscordMessage } from '~~/server/utils/discord'
import { logTwitchEvent } from '~~/server/utils/events-log'
import { botLogger } from '~~/server/utils/logger'
import { getAppSettings, updateAppSetting } from '~~/server/utils/settings'
import { getApiClient, getStreamerChannelName } from '~~/server/utils/twurple'

function getTemplate(id: string): string {
	return templateRegistry.get(id)?.template || ''
}

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
			const followerVars = {
				'follower': event.userDisplayName,
				'follower.name': event.userName,
				'follower.id': event.userId,
			}
			await renderAndPostAlert(
				settings.eventsubAlertFollowEnabled,
				getTemplate('eventsub.alert.follow'),
				{ id: event.userId, name: event.userName, displayName: event.userDisplayName },
				followerVars,
				{ user: event.userName, type: 'follow' },
			)
			await renderAndPostDiscordAlert(
				settings.discordAlertFollowEnabled,
				settings.discordAlertFollowChannelId,
				getTemplate('discord.alert.follow'),
				{ id: event.userId, name: event.userName, displayName: event.userDisplayName },
				followerVars,
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
			const subVars = {
				'subscriber': event.userDisplayName,
				'subscriber.name': event.userName,
				'subscriber.id': event.userId,
				'tier': event.tier,
			}
			await renderAndPostAlert(
				settings.eventsubAlertSubEnabled,
				getTemplate('eventsub.alert.sub'),
				{ id: event.userId, name: event.userName, displayName: event.userDisplayName },
				subVars,
				{ user: event.userName, type: 'subscription' },
			)
			await renderAndPostDiscordAlert(
				settings.discordAlertSubEnabled,
				settings.discordAlertSubChannelId,
				getTemplate('discord.alert.sub'),
				{ id: event.userId, name: event.userName, displayName: event.userDisplayName },
				subVars,
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
			const giftVars = {
				'gifter': event.gifterDisplayName || 'Anonymous',
				'gifter.name': event.gifterName || 'anonymous',
				'gifter.id': event.gifterId || 'anonymous',
				'count': event.amount,
			}
			await renderAndPostAlert(
				settings.eventsubAlertGiftEnabled,
				getTemplate('eventsub.alert.gift'),
				{
					id: event.gifterId || 'anonymous',
					name: event.gifterName || 'anonymous',
					displayName: event.gifterDisplayName || 'Anonymous',
				},
				giftVars,
				{ gifter: event.gifterName || 'anonymous', type: 'subscription.gift' },
			)
			await renderAndPostDiscordAlert(
				settings.discordAlertGiftEnabled,
				settings.discordAlertGiftChannelId,
				getTemplate('discord.alert.gift'),
				{
					id: event.gifterId || 'anonymous',
					name: event.gifterName || 'anonymous',
					displayName: event.gifterDisplayName || 'Anonymous',
				},
				giftVars,
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
			const cheerVars = {
				'cheerer': event.userDisplayName || 'Anonymous',
				'cheerer.name': event.userName || 'anonymous',
				'cheerer.id': event.userId || 'anonymous',
				'bits': event.bits,
				'message': event.message,
			}
			await renderAndPostAlert(
				settings.eventsubAlertCheerEnabled,
				getTemplate('eventsub.alert.cheer'),
				{
					id: event.userId || 'anonymous',
					name: event.userName || 'anonymous',
					displayName: event.userDisplayName || 'Anonymous',
				},
				cheerVars,
				{ user: event.userName || 'anonymous', bits: event.bits, type: 'cheer' },
			)
			await renderAndPostDiscordAlert(
				settings.discordAlertCheerEnabled,
				settings.discordAlertCheerChannelId,
				getTemplate('discord.alert.cheer'),
				{
					id: event.userId || 'anonymous',
					name: event.userName || 'anonymous',
					displayName: event.userDisplayName || 'Anonymous',
				},
				cheerVars,
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
			const raidVars = {
				'raider': event.raidingBroadcasterDisplayName,
				'raider.name': event.raidingBroadcasterName,
				'raider.id': event.raidingBroadcasterId,
				'viewers': event.viewers,
			}
			await renderAndPostAlert(
				settings.eventsubAlertRaidEnabled,
				getTemplate('eventsub.alert.raid'),
				{ id: event.raidingBroadcasterId, name: event.raidingBroadcasterName, displayName: event.raidingBroadcasterDisplayName },
				raidVars,
				{ raider: event.raidingBroadcasterName, viewers: event.viewers, type: 'raid' },
			)
			await renderAndPostDiscordAlert(
				settings.discordAlertRaidEnabled,
				settings.discordAlertRaidChannelId,
				getTemplate('discord.alert.raid'),
				{ id: event.raidingBroadcasterId, name: event.raidingBroadcasterName, displayName: event.raidingBroadcasterDisplayName },
				raidVars,
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

			const liveVars = {
				broadcaster: event.broadcasterDisplayName,
				game: channelInfo?.gameName || 'Just Chatting',
				title: channelInfo?.title || 'No Title',
			}

			// 1. Post to Twitch Chat
			await renderAndPostAlert(
				settings.eventsubAlertLiveEnabled,
				getTemplate('eventsub.alert.live'),
				{ id: event.broadcasterId, name: event.broadcasterName, displayName: event.broadcasterDisplayName },
				liveVars,
				{ user: event.broadcasterName, type: 'live' },
			)

			// 2. Post to Discord with Embed
			if (settings.discordAlertLiveEnabled && settings.discordAlertLiveChannelId) {
				const channel = (await getStreamerChannelName()) || 'streamer'
				const eventUser = { id: event.broadcasterId, name: event.broadcasterName, displayName: event.broadcasterDisplayName }
				const ctx = createTemplateContext(channel, eventUser)
				const renderedMessage = await renderCustomTemplate(
					getTemplate('discord.alert.live'),
					ctx,
					liveVars,
				)

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
			const offlineVars = {
				broadcaster: event.broadcasterDisplayName,
			}

			// 1. Post to Twitch Chat
			await renderAndPostAlert(
				settings.eventsubAlertOfflineEnabled,
				getTemplate('eventsub.alert.offline'),
				{ id: event.broadcasterId, name: event.broadcasterName, displayName: event.broadcasterDisplayName },
				offlineVars,
				{ user: event.broadcasterName, type: 'offline' },
			)

			// 2. Post to Discord
			await renderAndPostDiscordAlert(
				settings.discordAlertOfflineEnabled,
				settings.discordAlertOfflineChannelId,
				getTemplate('discord.alert.offline'),
				{ id: event.broadcasterId, name: event.broadcasterName, displayName: event.broadcasterDisplayName },
				offlineVars,
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

	eventSubManager.events.on('ad.break.begin', async (event) => {
		try {
			await logTwitchEvent('ad_break', event.broadcasterName, event.broadcasterDisplayName, {
				duration: event.durationSeconds,
				requester: event.requesterDisplayName || event.requesterName,
			})
			const settings = await getAppSettings()
			await renderAndPostAlert(
				settings.eventsubAlertAdBreakEnabled,
				getTemplate('eventsub.alert.adbreak'),
				{ id: event.broadcasterId, name: event.broadcasterName, displayName: event.broadcasterDisplayName },
				{
					duration: event.durationSeconds,
					requester: event.requesterDisplayName || event.requesterName,
				},
			)
		}
		catch (err) {
			botLogger.error({ err }, '[EventSub Alerts] Failed to handle ad break alert')
		}
	})

	eventSubManager.events.on('ban', async (event) => {
		try {
			const settings = await getAppSettings()
			const isTimeout = !event.isPermanent && !!event.endDate
			const duration = isTimeout && event.endDate ? Math.max(1, Math.round((event.endDate.getTime() - Date.now()) / 1000)) : 0

			const eventUser = { id: event.userId, name: event.userName, displayName: event.userDisplayName }
			const moderator = { name: event.moderatorName, displayName: event.moderatorDisplayName }

			if (isTimeout) {
				await logTwitchEvent('timeout', event.userName, event.userDisplayName, { duration, moderator: event.moderatorName })
				const timeoutVars = {
					'target': event.userDisplayName,
					'target.name': event.userName,
					'target.id': event.userId,
					'duration': duration,
					'moderator': event.moderatorDisplayName || event.moderatorName || 'Moderator',
				}
				await renderAndPostAlert(
					settings.eventsubAlertTimeoutEnabled,
					getTemplate('eventsub.alert.timeout'),
					eventUser,
					timeoutVars,
					{ user: event.userName, type: 'timeout' },
				)
				await renderAndPostDiscordAlert(
					settings.discordAlertTimeoutEnabled,
					settings.discordAlertTimeoutChannelId,
					getTemplate('discord.alert.timeout'),
					eventUser,
					timeoutVars,
					{ user: event.userName, type: 'discord-timeout' },
				)
				await postDiscordModerationEmbed(
					'🟠 User Timed Out',
					0xF59E0B,
					eventUser,
					moderator,
					`Timed out for ${duration}s (${Math.ceil(duration / 60)}m)`,
				)
			}
			else {
				await logTwitchEvent('ban', event.userName, event.userDisplayName, { moderator: event.moderatorName })
				const banVars = {
					'target': event.userDisplayName,
					'target.name': event.userName,
					'target.id': event.userId,
					'moderator': event.moderatorDisplayName || event.moderatorName || 'Moderator',
				}
				await renderAndPostAlert(
					settings.eventsubAlertBanEnabled,
					getTemplate('eventsub.alert.ban'),
					eventUser,
					banVars,
					{ user: event.userName, type: 'ban' },
				)
				await renderAndPostDiscordAlert(
					settings.discordAlertBanEnabled,
					settings.discordAlertBanChannelId,
					getTemplate('discord.alert.ban'),
					eventUser,
					banVars,
					{ user: event.userName, type: 'discord-ban' },
				)
				await postDiscordModerationEmbed(
					'🔴 User Banned',
					0xEF4444,
					eventUser,
					moderator,
					'Permanently Banned',
				)
			}
		}
		catch (err) {
			botLogger.error({ err }, '[EventSub Alerts] Failed to handle ban/timeout alert')
		}
	})

	eventSubManager.events.on('unban', async (event) => {
		try {
			await logTwitchEvent('unban', event.userName, event.userDisplayName, { moderator: event.moderatorName })
			const settings = await getAppSettings()
			const eventUser = { id: event.userId, name: event.userName, displayName: event.userDisplayName }
			const moderator = { name: event.moderatorName, displayName: event.moderatorDisplayName }

			const unbanVars = {
				'target': event.userDisplayName,
				'target.name': event.userName,
				'target.id': event.userId,
				'moderator': event.moderatorDisplayName || event.moderatorName || 'Moderator',
			}

			await renderAndPostAlert(
				settings.eventsubAlertUnbanEnabled,
				getTemplate('eventsub.alert.unban'),
				eventUser,
				unbanVars,
				{ user: event.userName, type: 'unban' },
			)
			await renderAndPostDiscordAlert(
				settings.discordAlertUnbanEnabled,
				settings.discordAlertUnbanChannelId,
				getTemplate('discord.alert.unban'),
				eventUser,
				unbanVars,
				{ user: event.userName, type: 'discord-unban' },
			)
			await postDiscordModerationEmbed(
				'🟢 User Unbanned',
				0x10B981,
				eventUser,
				moderator,
				'Unbanned',
			)
		}
		catch (err) {
			botLogger.error({ err }, '[EventSub Alerts] Failed to handle unban alert')
		}
	})

	eventSubManager.events.on('chat.message_delete', async (event: any) => {
		try {
			await logTwitchEvent('message_delete', event.userName, event.userDisplayName)
			const settings = await getAppSettings()
			const eventUser = { id: event.userId, name: event.userName, displayName: event.userDisplayName }
			const moderator = { name: event.moderatorName || 'Moderator', displayName: event.moderatorDisplayName || 'Moderator' }

			const deleteVars = {
				'target': event.userDisplayName,
				'target.name': event.userName,
				'target.id': event.userId,
				'message': event.messageText,
				'moderator': event.moderatorDisplayName || event.moderatorName || 'Moderator',
			}

			await renderAndPostAlert(
				settings.eventsubAlertMessageDeleteEnabled,
				getTemplate('eventsub.alert.message_delete'),
				eventUser,
				deleteVars,
				{ user: event.userName, type: 'message_delete' },
			)
			await renderAndPostDiscordAlert(
				settings.discordAlertMessageDeleteEnabled,
				settings.discordAlertMessageDeleteChannelId,
				getTemplate('discord.alert.message_delete'),
				eventUser,
				deleteVars,
				{ user: event.userName, type: 'discord-message_delete' },
			)
			await postDiscordModerationEmbed(
				'🔵 Message Deleted',
				0x3B82F6,
				eventUser,
				moderator,
				'Chat Message Deleted',
				event.messageText,
			)
		}
		catch (err) {
			botLogger.error({ err }, '[EventSub Alerts] Failed to handle message delete alert')
		}
	})
}

async function postDiscordModerationEmbed(
	title: string,
	color: number,
	targetUser: { id: string, name: string, displayName: string },
	moderator: { name: string, displayName: string },
	actionDetails: string,
	deletedMessageText?: string,
) {
	const settings = await getAppSettings()
	if (!settings.discordModerationLogEnabled || !settings.discordModerationLogChannelId) {
		return
	}

	const casterName = (await getStreamerChannelName()) || 'streamer'
	const viewercardUrl = `https://www.twitch.tv/popout/${casterName}/viewercard/${targetUser.name}`

	const fields: { name: string, value: string, inline?: boolean }[] = [
		{
			name: 'Target User',
			value: `[@${targetUser.name}](${viewercardUrl})`,
			inline: true,
		},
		{
			name: 'Moderator',
			value: moderator.displayName || moderator.name || 'System',
			inline: true,
		},
		{
			name: 'Action Details',
			value: actionDetails,
			inline: false,
		},
	]

	if (deletedMessageText) {
		fields.push({
			name: 'Deleted Message',
			value: deletedMessageText.length > 1000 ? `${deletedMessageText.slice(0, 997)}...` : deletedMessageText,
			inline: false,
		})
	}

	const recentMessages = getUserRecentMessages(targetUser.id)
	if (recentMessages.length > 0) {
		const historyText = recentMessages.map((msg, i) => `${i + 1}. ${msg}`).join('\n')
		fields.push({
			name: 'Last 5 Messages',
			value: historyText.length > 1000 ? `${historyText.slice(0, 997)}...` : historyText,
			inline: false,
		})
	}

	botLogger.info({ targetUser: targetUser.name, actionDetails }, '[Discord Moderation Log] Posting embed log')
	await sendDiscordMessage(settings.discordModerationLogChannelId, '', {
		title,
		url: viewercardUrl,
		color,
		fields,
		timestamp: true,
		footerText: 'Twitch Moderation Log',
	})
}
