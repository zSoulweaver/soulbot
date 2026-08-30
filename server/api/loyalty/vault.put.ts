import { vaultSettings } from '~~/server/settings'
import { requireUserRole } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'caster')
	const body = await readBody(event)

	try {
		await vaultSettings.update(body)
		return { success: true }
	}
	catch (err: any) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid vault settings data',
			data: err?.format ? err.format() : err,
		})
	}
})
