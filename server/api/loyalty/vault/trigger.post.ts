import { startVaultRaid } from '~~/server/bot/modules/points/vault-manager'
import { requireUserRole } from '~~/server/utils/auth'
import { getAppSettings } from '~~/server/utils/settings'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'caster')

	const settings = await getAppSettings()
	const now = Date.now()

	if (Number(settings.pointsVaultEndTime) > now) {
		throw createError({
			statusCode: 400,
			statusMessage: 'A Vault Raid is already active.',
		})
	}

	const result = await startVaultRaid()
	return result
})
