import { templateRegistry } from '~~/server/bot/core/templates'
import { getChatClient, getStreamerChannelName } from '~~/server/utils/twurple'
import { botLogger } from './logger'

/**
 * Renders a bot command template and broadcasts it to the streamer's Twitch chat channel.
 */
export async function sendChannelChatMessage(templateId: string, data: Record<string, string | number> = {}) {
	try {
		const chat = await getChatClient()
		const channel = await getStreamerChannelName()
		if (chat && channel) {
			const rendered = templateRegistry.render(templateId, data)
			await chat.say(channel, rendered)
			botLogger.info({ templateId, channel }, '[Chat Utils] Sent message to chat')
		}
		else {
			botLogger.warn({ templateId }, '[Chat Utils] Chat client or channel not ready; could not send message')
		}
	}
	catch (err) {
		botLogger.error({ err, templateId }, '[Chat Utils] Failed to send channel chat message')
	}
}
