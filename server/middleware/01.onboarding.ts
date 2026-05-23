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

	if (isOnboarded && url.pathname === '/setup') {
		return sendRedirect(event, '/')
	}
})
