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

	if (!isOnboarded) {
		const tokens = await db.select().from(twitchTokens)
		const hasBot = tokens.some(t => t.accountType === 'bot')
		const hasStreamer = tokens.some(t => t.accountType === 'streamer')
		isOnboarded = hasBot && hasStreamer
	}

	// 1. If not onboarded yet, only allow setup pages and auth/status APIs. Redirect all other traffic.
	if (!isOnboarded) {
		if (
			url.pathname === '/setup'
			|| url.pathname.startsWith('/api/bot/auth')
			|| url.pathname.startsWith('/api/bot/status')
		) {
			return
		}
		return sendRedirect(event, '/setup')
	}

	// 2. If onboarded, restrict setup and auth endpoints
	const settings = await getAppSettings()
	const isOutdated = settings.streamerTokenVersion < STREAMER_OAUTH_VERSION

	if (url.pathname === '/setup' || url.pathname.startsWith('/api/bot/auth')) {
		const session = await getUserSession(event)
		const isCaster = session?.user?.role === 'caster'

		// Only allow casters to access when streamer token is outdated.
		if (!isCaster || !isOutdated) {
			if (url.pathname === '/setup') {
				return sendRedirect(event, '/')
			}
			else {
				throw createError({
					statusCode: 403,
					statusMessage: 'Forbidden: Only the caster can modify bot setup.',
				})
			}
		}
	}
})
