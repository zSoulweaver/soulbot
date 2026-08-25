import { BOT_OAUTH_VERSION, STREAMER_OAUTH_VERSION } from '~~/server/config/twitch'
import { db } from '~~/server/database'
import { twitchTokens } from '~~/server/database/schema'
import { getAppSettings } from '~~/server/utils/settings'
import { getBotModeratorStatus, getBotToken, getStreamerToken, isBotRunning, syncModeratorRolesThrottled } from '~~/server/utils/twurple'

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

	const session = await getUserSession(event)
	const user = session?.user
	const isBotAccount = Boolean(user && botToken && user.id === botToken.userId)
	const isModOrCaster = user && (user.role === 'caster' || user.role === 'admin' || user.role === 'moderator')

	if (isOnboarded && !isBotAccount && !isModOrCaster) {
		return {
			bot: botToken ? { userName: botToken.userName, displayName: botToken.displayName } : null,
			streamer: streamerToken ? { userName: streamerToken.userName, displayName: streamerToken.displayName } : null,
			isBotRunning: isBotRunning(),
			isStreamerTokenOutdated: false,
			isBotTokenOutdated: false,
			isBotModerator: false,
		}
	}

	const isCaster = user?.role === 'caster'
	const canViewOutdatedTokens = !isOnboarded || isCaster || isBotAccount

	const appSettings = await getAppSettings()
	const isStreamerTokenOutdated = (canViewOutdatedTokens && streamerToken)
		? (appSettings.streamerTokenVersion < STREAMER_OAUTH_VERSION)
		: false
	const isBotTokenOutdated = (canViewOutdatedTokens && botToken)
		? (appSettings.botTokenVersion < BOT_OAUTH_VERSION)
		: false

	const isBotModerator = isBotRunning()
		? await getBotModeratorStatus(force)
		: false

	// Trigger throttled moderator role synchronization in the background
	if (isBotRunning()) {
		syncModeratorRolesThrottled(force).catch((err) => {
			console.error('[Bot Status API] Failed to run syncModeratorRolesThrottled:', err)
		})
	}

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
