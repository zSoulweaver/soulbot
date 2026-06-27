import process from 'node:process'
import { db } from '~~/server/database'
import { twitchTokens } from '~~/server/database/schema'

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

	// If not onboarded yet, only allow setup pages and auth/status APIs. Redirect all other traffic.
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

	// If onboarded, restrict setup and auth endpoints to casters and the bot account only
	if (url.pathname === '/setup' || url.pathname.startsWith('/api/bot/auth')) {
		const session = await getUserSession(event)
		const isCaster = session?.user?.role === 'caster'

		if (!isCaster) {
			const { getBotToken } = await import('~~/server/utils/twurple')
			const botToken = await getBotToken()
			const isBotAccount = session?.user && botToken && session.user.id === botToken.userId

			if (!isBotAccount) {
				if (url.pathname === '/setup') {
					return sendRedirect(event, '/')
				}
				else {
					throw createError({
						statusCode: 403,
						statusMessage: 'Only the caster can modify bot setup.',
					})
				}
			}
		}
	}
})
