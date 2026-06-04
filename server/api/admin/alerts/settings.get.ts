import { requireUserRole } from '~~/server/utils/auth'
import { getAppSettings } from '~~/server/utils/settings'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')
	const appSettings = await getAppSettings()

	return {
		eventsubAlertFollowEnabled: appSettings.eventsubAlertFollowEnabled,
		eventsubAlertSubEnabled: appSettings.eventsubAlertSubEnabled,
		eventsubAlertGiftEnabled: appSettings.eventsubAlertGiftEnabled,
		eventsubAlertCheerEnabled: appSettings.eventsubAlertCheerEnabled,
		eventsubPointsFollowEnabled: appSettings.eventsubPointsFollowEnabled,
		eventsubPointsSubEnabled: appSettings.eventsubPointsSubEnabled,
		eventsubPointsGiftEnabled: appSettings.eventsubPointsGiftEnabled,
		eventsubPointsCheerEnabled: appSettings.eventsubPointsCheerEnabled,
		eventsubAlertFollow: appSettings.eventsubAlertFollow,
		eventsubAlertSub: appSettings.eventsubAlertSub,
		eventsubAlertGift: appSettings.eventsubAlertGift,
		eventsubAlertCheer: appSettings.eventsubAlertCheer,
		eventsubPointsFollow: appSettings.eventsubPointsFollow,
		eventsubPointsSub: appSettings.eventsubPointsSub,
		eventsubPointsGift: appSettings.eventsubPointsGift,
		eventsubPointsCheer: appSettings.eventsubPointsCheer,
	}
})
