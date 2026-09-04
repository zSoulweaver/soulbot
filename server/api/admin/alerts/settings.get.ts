import { templateRegistry } from '~~/server/bot/core/templates'
import { alertsSettings } from '~~/server/settings'
import { requireUserRole } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')
	const settings = alertsSettings.get()
	const getVal = (id: string) => templateRegistry.get(id)?.template || ''
	return {
		...settings,
		eventsubAlertFollow: getVal('eventsub.alert.follow'),
		eventsubAlertSub: getVal('eventsub.alert.sub'),
		eventsubAlertGift: getVal('eventsub.alert.gift'),
		eventsubAlertCheer: getVal('eventsub.alert.cheer'),
		eventsubAlertRaid: getVal('eventsub.alert.raid'),
		eventsubAlertLive: getVal('eventsub.alert.live'),
		eventsubAlertOffline: getVal('eventsub.alert.offline'),
		eventsubAlertBan: getVal('eventsub.alert.ban'),
		eventsubAlertTimeout: getVal('eventsub.alert.timeout'),
		eventsubAlertUnban: getVal('eventsub.alert.unban'),
		eventsubAlertMessageDelete: getVal('eventsub.alert.message_delete'),
		eventsubAlertAdBreak: getVal('eventsub.alert.adbreak'),
	}
})
