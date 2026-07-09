import { BOT_OAUTH_VERSION, STREAMER_OAUTH_VERSION } from '~~/server/config/twitch'
import { db } from '~~/server/database'
import { twitchTokens } from '~~/server/database/schema'
import { getAppSettings } from '~~/server/utils/settings'
import { getBotModeratorStatus, getBotToken, getStreamerToken, isBotRunning } from '~~/server/utils/twurple'

export default defineEventHandler(async (event) => {
	const query = getQuery(event) || {}
	const force = query.force === 'true' || query.refresh === 'true'

	// Allow public access during initial onboarding only
	const existingTokens = await db.select().from(twitchTokens)
	const hasBot = existingTokens.some(t => t.accountType === 'bot')
	const hasStreamer = existingTokens.some(t => t.accountType === 'streamer')
	const isOnboarded = hasBot && hasStreamer

	const botToken = await getBotToken()
	const streamerToken = await getStreamerToken()

	if (isOnboarded) {
		const session = await getUserSession(event)
		const user = session?.user
		const isBotAccount = user && botToken && user.id === botToken.userId
		const isModOrCaster = user && (user.role === 'caster' || user.role === 'moderator')

		if (!isBotAccount && !isModOrCaster) {
			return {
				bot: botToken ? { userName: botToken.userName, displayName: botToken.displayName } : null,
				streamer: streamerToken ? { userName: streamerToken.userName, displayName: streamerToken.displayName } : null,
				isBotRunning: isBotRunning(),
				isStreamerTokenOutdated: false,
				isBotTokenOutdated: false,
				isBotModerator: false,
			}
		}
	}

	const appSettings = await getAppSettings()
	const isStreamerTokenOutdated = streamerToken
		? (appSettings.streamerTokenVersion < STREAMER_OAUTH_VERSION)
		: false
	const isBotTokenOutdated = botToken
		? (appSettings.botTokenVersion < BOT_OAUTH_VERSION)
		: false

	const isBotModerator = await getBotModeratorStatus(force)

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
		isBotTokenOutdated,
		isBotModerator,
	}
})
