import { requireUserRole } from '~~/server/utils/auth'
import { initTwurple, startBot, stopBot } from '~~/server/utils/twurple'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'caster')

	// Stop existing client connection
	await stopBot()

	// Re-initialize and load newest tokens from DB
	await initTwurple()

	// Start bot client
	const result = await startBot()

	if (result === 'no_tokens') {
		throw createError({
			statusCode: 400,
			statusMessage: 'Failed to restart bot. Ensure both accounts are authenticated.',
		})
	}

	return { status: 'ok', message: 'Bot restarted successfully' }
})
