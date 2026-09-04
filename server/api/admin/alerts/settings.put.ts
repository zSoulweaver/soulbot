import { templateRegistry } from '~~/server/bot/core/templates'
import { alertsSettings } from '~~/server/settings'
import { requireUserRole } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'caster')
	const body = await readBody(event)

	try {
		await alertsSettings.update(body)

		if (typeof body.eventsubAlertFollow === 'string')
			await templateRegistry.update('eventsub.alert.follow', body.eventsubAlertFollow)
		if (typeof body.eventsubAlertSub === 'string')
			await templateRegistry.update('eventsub.alert.sub', body.eventsubAlertSub)
		if (typeof body.eventsubAlertGift === 'string')
			await templateRegistry.update('eventsub.alert.gift', body.eventsubAlertGift)
		if (typeof body.eventsubAlertCheer === 'string')
			await templateRegistry.update('eventsub.alert.cheer', body.eventsubAlertCheer)
		if (typeof body.eventsubAlertRaid === 'string')
			await templateRegistry.update('eventsub.alert.raid', body.eventsubAlertRaid)
		if (typeof body.eventsubAlertLive === 'string')
			await templateRegistry.update('eventsub.alert.live', body.eventsubAlertLive)
		if (typeof body.eventsubAlertOffline === 'string')
			await templateRegistry.update('eventsub.alert.offline', body.eventsubAlertOffline)
		if (typeof body.eventsubAlertBan === 'string')
			await templateRegistry.update('eventsub.alert.ban', body.eventsubAlertBan)
		if (typeof body.eventsubAlertTimeout === 'string')
			await templateRegistry.update('eventsub.alert.timeout', body.eventsubAlertTimeout)
		if (typeof body.eventsubAlertUnban === 'string')
			await templateRegistry.update('eventsub.alert.unban', body.eventsubAlertUnban)
		if (typeof body.eventsubAlertMessageDelete === 'string')
			await templateRegistry.update('eventsub.alert.message_delete', body.eventsubAlertMessageDelete)
		if (typeof body.eventsubAlertAdBreak === 'string')
			await templateRegistry.update('eventsub.alert.adbreak', body.eventsubAlertAdBreak)

		return { success: true }
	}
	catch (err: any) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid EventSub settings data',
			data: err?.format ? err.format() : err,
		})
	}
})
