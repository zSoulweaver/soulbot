import { templateRegistry } from '~~/server/bot/core/templates'
import { vaultSettings } from '~~/server/settings'
import { requireUserRole } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'caster')
	const settings = vaultSettings.get()
	const tStart = templateRegistry.get('vault.start')
	const tWarning = templateRegistry.get('vault.warning')
	const tWin = templateRegistry.get('vault.win')
	const tLose = templateRegistry.get('vault.lose')
	return {
		...settings,
		startMessage: tStart?.isOverridden ? tStart.current : settings.startMessage,
		warningMessage: tWarning?.isOverridden ? tWarning.current : settings.warningMessage,
		endWinMessage: tWin?.isOverridden ? tWin.current : settings.endWinMessage,
		endLoseMessage: tLose?.isOverridden ? tLose.current : settings.endLoseMessage,
	}
})
