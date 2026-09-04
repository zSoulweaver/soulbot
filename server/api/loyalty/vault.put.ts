import { templateRegistry } from '~~/server/bot/core/templates'
import { vaultSettings } from '~~/server/settings'
import { requireUserRole } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'caster')
	const body = await readBody(event)

	try {
		await vaultSettings.update(body)

		if (typeof body.startMessage === 'string')
			await templateRegistry.update('vault.start', body.startMessage)
		if (typeof body.warningMessage === 'string')
			await templateRegistry.update('vault.warning', body.warningMessage)
		if (typeof body.endWinMessage === 'string')
			await templateRegistry.update('vault.win', body.endWinMessage)
		if (typeof body.endLoseMessage === 'string')
			await templateRegistry.update('vault.lose', body.endLoseMessage)

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
