import { templateRegistry } from '~~/server/bot/core/templates'
import { getAppSettings } from '~~/server/utils/settings'
import { getChatClient, getStreamerChannelName } from '~~/server/utils/twurple'
import { botLogger } from './logger'

/**
 * Sends a raw chat message to the channel, respecting the mute and chat mode (normal/action) settings.
 */
export async function sendRawChatMessage(channel: string, message: string) {
	try {
		const settings = await getAppSettings()
		if (settings.botMuted) {
			botLogger.info({ channel, message }, '[Chat Utils] Bot is muted; message suppressed')
			return
		}

		const chat = await getChatClient()
		if (!chat || !chat.isConnected) {
			botLogger.warn({ channel }, '[Chat Utils] Chat client not ready or not connected; could not send message')
			return
		}

		if (settings.botChatMode === 'action') {
			await chat.action(channel, message)
		}
		else {
			await chat.say(channel, message)
		}
		botLogger.info({ channel }, '[Chat Utils] Sent message to chat')
	}
	catch (err) {
		botLogger.error({ err, channel }, '[Chat Utils] Failed to send raw chat message')
	}
}

/**
 * Renders a bot command template and broadcasts it to the streamer's Twitch chat channel.
 */
export async function sendChannelChatMessage(templateId: string, data: Record<string, string | number> = {}) {
	try {
		const channel = await getStreamerChannelName()
		if (channel) {
			const rendered = templateRegistry.render(templateId, data)
			await sendRawChatMessage(channel, rendered)
		}
		else {
			botLogger.warn({ templateId }, '[Chat Utils] Channel not ready; could not send message')
		}
	}
	catch (err) {
		botLogger.error({ err, templateId }, '[Chat Utils] Failed to send channel chat message')
	}
}
