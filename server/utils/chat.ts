import { and, asc, eq, or } from 'drizzle-orm'
import { templateRegistry } from '~~/server/bot/core/templates'
import { db } from '~~/server/database'
import { spotifyQueue } from '~~/server/database/schema'
import { getAppSettings } from '~~/server/utils/settings'
import { getApiClient, getBotToken, getChatClient, getStreamerChannelName } from '~~/server/utils/twurple'
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

/**
 * Sends a Twitch whisper to a user from the bot.
 */
export async function sendWhisper(username: string, message: string): Promise<boolean> {
	try {
		const botToken = await getBotToken()
		if (!botToken || !botToken.userId) {
			botLogger.warn('[Chat Utils] Bot credentials missing; could not send whisper')
			return false
		}

		const { getUserRecord } = await import('~~/server/bot/services/user')
		const userRecord = await getUserRecord(username)
		if (!userRecord || !userRecord.id) {
			botLogger.warn({ username }, '[Chat Utils] User record not found; could not send whisper')
			return false
		}

		const api = getApiClient()
		await api.whispers.sendWhisper(botToken.userId, userRecord.id, message)
		botLogger.info({ username }, '[Chat Utils] Sent whisper to user')
		return true
	}
	catch (err) {
		botLogger.error({ err, username }, '[Chat Utils] Failed to send whisper')
		return false
	}
}

/**
 * Notifies the requester when a song is saved to the Spotify target playlist.
 */
export async function notifySongSaved(
	trackId: string,
	title: string,
	artist: string,
	isFromChatCommand = false,
) {
	try {
		const appSettings = await getAppSettings()

		// Find the active queue item in the database
		const activeTrack = await db
			.select()
			.from(spotifyQueue)
			.where(
				and(
					eq(spotifyQueue.trackId, trackId),
					or(
						eq(spotifyQueue.status, 'playing'),
						eq(spotifyQueue.status, 'pending'),
					),
				),
			)
			.orderBy(asc(spotifyQueue.id))
			.then(res => res[0])

		const requester = (activeTrack && activeTrack.requestedBy !== 'Fallback Playlist')
			? activeTrack.requestedBy
			: null

		if (appSettings.spotifyPlaylistWhisper && requester) {
			const message = `Your requested song "${title}" by ${artist} has been saved to the stream's Spotify playlist!`
			await sendWhisper(requester, message)
		}
		else if (!isFromChatCommand) {
			const caster = (await getStreamerChannelName()) || 'streamer'
			await sendChannelChatMessage('spotify.playlist.liked', {
				caster,
				requester: requester || caster,
			})
		}
	}
	catch (err) {
		botLogger.error({ err, trackId }, '[Chat Utils] Failed to process song saved notification')
	}
}
