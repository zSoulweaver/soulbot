import { requireUserRole } from '~~/server/utils/auth'
import { getAppSettings } from '~~/server/utils/settings'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')
	const appSettings = await getAppSettings()

	return {
		adsAlertsEnabled: appSettings.adsAlertsEnabled,
		adsAlert5mEnabled: appSettings.adsAlert5mEnabled,
		adsAlert3mEnabled: appSettings.adsAlert3mEnabled,
		adsAlert1mEnabled: appSettings.adsAlert1mEnabled,
		adsAlertTemplate: appSettings.adsAlertTemplate,
	}
})
