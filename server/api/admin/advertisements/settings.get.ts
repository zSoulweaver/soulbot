import { templateRegistry } from '~~/server/bot/core/templates'
import { adsSettings } from '~~/server/settings'
import { requireUserRole } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')
	const settings = adsSettings.get()
	const t = templateRegistry.get('ads.alert')
	return {
		...settings,
		adsAlertTemplate: t?.template || '',
	}
})
