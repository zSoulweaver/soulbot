import { requireUserRole } from '~~/server/utils/auth'
import { stopBot } from '~~/server/utils/twurple'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'caster')
	const result = await stopBot()

	if (result === 'not_running') {
		throw createError({
			statusCode: 409,
			statusMessage: 'Bot is not running.',
		})
	}

	return { status: 'ok', message: 'Bot stopped successfully' }
})
