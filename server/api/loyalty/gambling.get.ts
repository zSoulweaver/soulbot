import { templateRegistry } from '~~/server/bot/core/templates'
import { gamblingSettings } from '~~/server/settings'
import { requireUserRole } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'caster')
	const settings = gamblingSettings.get()
	const tStart = templateRegistry.get('gambling.bonus_start')
	const tEnd = templateRegistry.get('gambling.bonus_end')
	return {
		...settings,
		bonusMessage: tStart?.template || '',
		bonusEndMessage: tEnd?.template || '',
	}
})
