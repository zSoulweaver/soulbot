import { initTwurple, startBot } from '../../utils/twurple'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'caster')
	await initTwurple()
	const result = await startBot()

	if (result === 'already_running') {
		throw createError({
			statusCode: 409,
			statusMessage: 'Bot is already running.',
		})
	}

	if (result === 'no_tokens') {
		throw createError({
			statusCode: 400,
			statusMessage: 'Failed to start bot. Ensure both accounts are authenticated.',
		})
	}

	return { status: 'ok', message: 'Bot started successfully' }
})
