import { eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { twitchTokens } from '~~/server/database/schema'
import { botLogger } from '~~/server/utils/logger'
import { getApiClient } from '~~/server/utils/twurple'

export interface StreamInfo {
	isOnline: boolean
	title?: string
	uptime?: number // in seconds
	viewerCount?: number
}

/**
 * Service to fetch stream information and online status from Twitch Helix.
 */
export async function getStreamInfo(): Promise<StreamInfo> {
	try {
		const streamerToken = await db
			.select()
			.from(twitchTokens)
			.where(eq(twitchTokens.accountType, 'streamer'))
			.then(res => res[0])

		if (!streamerToken || !streamerToken.userId) {
			return { isOnline: false }
		}

		const api = getApiClient()
		const stream = await api.streams.getStreamByUserId(streamerToken.userId)

		if (!stream) {
			return { isOnline: false }
		}

		// Calculate uptime in seconds if live
		const uptime = Math.floor((Date.now() - stream.startDate.getTime()) / 1000)

		return {
			isOnline: true,
			title: stream.title,
			uptime,
			viewerCount: stream.viewers,
			// Additional fields can be added here in the future (e.g., game, tags, etc.)
		}
	}
	catch (err) {
		botLogger.error({ err }, 'Error fetching stream info from Twitch')
		return { isOnline: false }
	}
}
