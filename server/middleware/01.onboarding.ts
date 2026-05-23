import process from 'node:process'
import { STREAMER_OAUTH_VERSION } from '~~/server/config/twitch'
import { db } from '~~/server/database'
import { twitchTokens } from '~~/server/database/schema'
import { getAppSettings } from '~~/server/utils/settings'

let isOnboarded = false

export default defineEventHandler(async (event) => {
	if (process.env.NODE_ENV === 'test') {
		return
	}

	const url = getRequestURL(event)

	if (
		url.pathname.startsWith('/_nuxt')
		|| url.pathname.startsWith('/__nuxt')
		|| url.pathname.startsWith('/favicon.ico')
	) {
		return
	}

	if (
		url.pathname === '/setup'
		|| url.pathname.startsWith('/api/bot/auth')
		|| url.pathname.startsWith('/api/bot/status')
	) {
		return
	}

	if (!isOnboarded) {
		const tokens = await db.select().from(twitchTokens)
		const hasBot = tokens.some(t => t.accountType === 'bot')
		const hasStreamer = tokens.some(t => t.accountType === 'streamer')
		isOnboarded = hasBot && hasStreamer
	}

	if (!isOnboarded) {
		return sendRedirect(event, '/setup')
	}

	const settings = await getAppSettings()
	const isOutdated = settings.streamerTokenVersion < STREAMER_OAUTH_VERSION

	if (isOnboarded && !isOutdated && url.pathname === '/setup') {
		return sendRedirect(event, '/')
	}
})
