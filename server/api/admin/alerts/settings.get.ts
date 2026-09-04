import { templateRegistry } from '~~/server/bot/core/templates'
import { alertsSettings } from '~~/server/settings'
import { requireUserRole } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')
	const settings = alertsSettings.get()
	const getVal = (id: string, fallback: string) => {
		const t = templateRegistry.get(id)
		return t?.isOverridden ? t.current : fallback
	}
	return {
		...settings,
		eventsubAlertFollow: getVal('eventsub.alert.follow', settings.eventsubAlertFollow),
		eventsubAlertSub: getVal('eventsub.alert.sub', settings.eventsubAlertSub),
		eventsubAlertGift: getVal('eventsub.alert.gift', settings.eventsubAlertGift),
		eventsubAlertCheer: getVal('eventsub.alert.cheer', settings.eventsubAlertCheer),
		eventsubAlertRaid: getVal('eventsub.alert.raid', settings.eventsubAlertRaid),
		eventsubAlertLive: getVal('eventsub.alert.live', settings.eventsubAlertLive),
		eventsubAlertOffline: getVal('eventsub.alert.offline', settings.eventsubAlertOffline),
		eventsubAlertBan: getVal('eventsub.alert.ban', settings.eventsubAlertBan),
		eventsubAlertTimeout: getVal('eventsub.alert.timeout', settings.eventsubAlertTimeout),
		eventsubAlertUnban: getVal('eventsub.alert.unban', settings.eventsubAlertUnban),
		eventsubAlertMessageDelete: getVal('eventsub.alert.message_delete', settings.eventsubAlertMessageDelete),
		eventsubAlertAdBreak: getVal('eventsub.alert.adbreak', settings.eventsubAlertAdBreak),
	}
})
