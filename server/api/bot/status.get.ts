import { STREAMER_OAUTH_VERSION } from '~~/server/config/twitch'
import { getAppSettings } from '~~/server/utils/settings'
import { getBotToken, getStreamerToken, isBotRunning } from '~~/server/utils/twurple'

export default defineEventHandler(async () => {
	const botToken = await getBotToken()
	const streamerToken = await getStreamerToken()

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
