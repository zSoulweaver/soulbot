import { templateRegistry } from '~~/server/bot/core/templates'
import { adsSettings } from '~~/server/settings'
import { requireUserRole } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'caster')
	const body = await readBody(event)

	try {
		await adsSettings.update(body)

		if (typeof body.adsAlertTemplate === 'string')
			await templateRegistry.update('ads.alert', body.adsAlertTemplate)

		return { success: true }
	}
	catch (err: any) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid advertisement settings data',
			data: err?.format ? err.format() : err,
		})
	}
})
