import { requireUserRole } from '~~/server/utils/auth'
import { getAppSettings } from '~~/server/utils/settings'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')
	const settings = await getAppSettings()

	return {
		minBet: settings.pointsGamblingMinBet,
		maxBet: settings.pointsGamblingMaxBet,
		winMinRoll: settings.pointsGamblingWinMinRoll,
		winMultiplier: settings.pointsGamblingWinMultiplier,
	}
})
