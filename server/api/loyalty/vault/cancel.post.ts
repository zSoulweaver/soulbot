import { cancelVaultRaid } from '~~/server/bot/modules/points/vault-manager'
import { requireUserRole } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'caster')

	await cancelVaultRaid()

	return { success: true }
})
