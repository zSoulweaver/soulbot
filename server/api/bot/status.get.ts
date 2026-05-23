import { STREAMER_OAUTH_VERSION } from '~~/server/config/twitch'
import { db } from '~~/server/database'
import { twitchTokens } from '~~/server/database/schema'
import { getAppSettings } from '~~/server/utils/settings'
import { isBotRunning } from '~~/server/utils/twurple'

export default defineEventHandler(async () => {
	const tokens = await db.select().from(twitchTokens)

	const botToken = tokens.find(t => t.accountType === 'bot')
	const streamerToken = tokens.find(t => t.accountType === 'streamer')

	const appSettings = await getAppSettings()
	const isStreamerTokenOutdated = streamerToken
		? (appSettings.streamerTokenVersion < STREAMER_OAUTH_VERSION)
		: false

	return {
		bot: botToken
			? {
					userId: botToken.userId,
					userName: botToken.userName,
					displayName: botToken.displayName,
				}
			: null,
		streamer: streamerToken
			? {
					userId: streamerToken.userId,
					userName: streamerToken.userName,
					displayName: streamerToken.displayName,
				}
			: null,
		isBotRunning: isBotRunning(),
		isStreamerTokenOutdated,
	}
})
