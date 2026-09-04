import { templateRegistry } from '~~/server/bot/core/templates'
import { gamblingSettings } from '~~/server/settings'
import { requireUserRole } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'caster')
	const body = await readBody(event)

	try {
		await gamblingSettings.update(body)

		if (typeof body.bonusMessage === 'string')
			await templateRegistry.update('gambling.bonus_start', body.bonusMessage)
		if (typeof body.bonusEndMessage === 'string')
			await templateRegistry.update('gambling.bonus_end', body.bonusEndMessage)

		return { success: true }
	}
	catch (err: any) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid gambling settings data',
			data: err?.format ? err.format() : err,
		})
	}
})
