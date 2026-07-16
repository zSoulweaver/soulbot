import { requireUserRole } from '~~/server/utils/auth'
import { getAppSettings } from '~~/server/utils/settings'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'caster')
	const settings = await getAppSettings()

	return {
		minBet: settings.pointsGamblingMinBet,
		maxBet: settings.pointsGamblingMaxBet,
		winMinRoll: settings.pointsGamblingWinMinRoll,
		winMultiplier: settings.pointsGamblingWinMultiplier,
		bonusDuration: settings.pointsGamblingBonusDuration,
		bonusWinMultiplier: settings.pointsGamblingBonusWinMultiplier,
		bonusWinMinRoll: settings.pointsGamblingBonusWinMinRoll,
		bonusMessage: settings.pointsGamblingBonusMessage,
		bonusEndMessage: settings.pointsGamblingBonusEndMessage,
		bonusEndTime: settings.pointsGamblingBonusEndTime,
	}
})
