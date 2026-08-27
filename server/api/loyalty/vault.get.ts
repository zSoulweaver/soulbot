import { requireUserRole } from '~~/server/utils/auth'
import { getAppSettings } from '~~/server/utils/settings'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'caster')
	const settings = await getAppSettings()

	return {
		minBet: settings.pointsVaultMinBet,
		maxBet: settings.pointsVaultMaxBet,
		winMinRoll: settings.pointsVaultWinMinRoll,
		winMultiplier: settings.pointsVaultWinMultiplier,
		duration: settings.pointsVaultDuration,
		warningEnabled: settings.pointsVaultWarningEnabled,
		endTime: settings.pointsVaultEndTime,
		startMessage: settings.pointsVaultStartMessage,
		warningMessage: settings.pointsVaultWarningMessage,
		endWinMessage: settings.pointsVaultEndWinMessage,
		endLoseMessage: settings.pointsVaultEndLoseMessage,
	}
})
