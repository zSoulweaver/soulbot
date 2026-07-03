import { sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '~~/server/database'
import { settings } from '~~/server/database/schema'
import { requireUserRole } from '~~/server/utils/auth'
import { refreshAppSettingsCache } from '~~/server/utils/settings'

const saveAlertSettingsSchema = z.object({
	eventsubAlertFollowEnabled: z.boolean(),
	eventsubAlertSubEnabled: z.boolean(),
	eventsubAlertGiftEnabled: z.boolean(),
	eventsubAlertCheerEnabled: z.boolean(),
	eventsubAlertRaidEnabled: z.boolean().optional(),
	eventsubAlertLiveEnabled: z.boolean().optional(),
	eventsubAlertOfflineEnabled: z.boolean().optional(),
	eventsubPointsFollowEnabled: z.boolean(),
	eventsubPointsSubEnabled: z.boolean(),
	eventsubPointsGiftEnabled: z.boolean(),
	eventsubPointsCheerEnabled: z.boolean(),
	eventsubAlertFollow: z.string().max(500, 'Follow alert template is too long'),
	eventsubAlertSub: z.string().max(500, 'Subscription alert template is too long'),
	eventsubAlertGift: z.string().max(500, 'Sub-gift alert template is too long'),
	eventsubAlertCheer: z.string().max(500, 'Cheer alert template is too long'),
	eventsubAlertRaid: z.string().max(500, 'Raid alert template is too long').optional(),
	eventsubAlertLive: z.string().max(500, 'Live alert template is too long').optional(),
	eventsubAlertOffline: z.string().max(500, 'Offline alert template is too long').optional(),
	eventsubPointsFollow: z.number().int().min(0, 'Follow reward must be non-negative'),
	eventsubPointsSub: z.number().int().min(0, 'Subscription reward must be non-negative'),
	eventsubPointsGift: z.number().int().min(0, 'Sub-gift reward must be non-negative'),
	eventsubPointsCheer: z.number().int().min(0, 'Cheer multiplier must be non-negative'),
	eventsubAlertAdBreakEnabled: z.boolean(),
	eventsubAlertAdBreak: z.string().max(500, 'Ad break alert template is too long'),
})

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'caster')
	const body = await readBody(event)
	const parsed = saveAlertSettingsSchema.safeParse(body)

	if (!parsed.success) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid EventSub settings data',
			data: parsed.error.format(),
		})
	}

	const d = parsed.data

	const keysToUpsert = [
		{ key: 'eventsub.alert.follow.enabled', value: String(d.eventsubAlertFollowEnabled), updatedAt: new Date() },
		{ key: 'eventsub.alert.sub.enabled', value: String(d.eventsubAlertSubEnabled), updatedAt: new Date() },
		{ key: 'eventsub.alert.gift.enabled', value: String(d.eventsubAlertGiftEnabled), updatedAt: new Date() },
		{ key: 'eventsub.alert.cheer.enabled', value: String(d.eventsubAlertCheerEnabled), updatedAt: new Date() },
		{ key: 'eventsub.points.follow.enabled', value: String(d.eventsubPointsFollowEnabled), updatedAt: new Date() },
		{ key: 'eventsub.points.sub.enabled', value: String(d.eventsubPointsSubEnabled), updatedAt: new Date() },
		{ key: 'eventsub.points.gift.enabled', value: String(d.eventsubPointsGiftEnabled), updatedAt: new Date() },
		{ key: 'eventsub.points.cheer.enabled', value: String(d.eventsubPointsCheerEnabled), updatedAt: new Date() },
		{ key: 'eventsub.alert.follow', value: d.eventsubAlertFollow, updatedAt: new Date() },
		{ key: 'eventsub.alert.sub', value: d.eventsubAlertSub, updatedAt: new Date() },
		{ key: 'eventsub.alert.gift', value: d.eventsubAlertGift, updatedAt: new Date() },
		{ key: 'eventsub.alert.cheer', value: d.eventsubAlertCheer, updatedAt: new Date() },
		{ key: 'eventsub.points.follow', value: String(d.eventsubPointsFollow), updatedAt: new Date() },
		{ key: 'eventsub.points.sub', value: String(d.eventsubPointsSub), updatedAt: new Date() },
		{ key: 'eventsub.points.gift', value: String(d.eventsubPointsGift), updatedAt: new Date() },
		{ key: 'eventsub.points.cheer', value: String(d.eventsubPointsCheer), updatedAt: new Date() },
		{ key: 'eventsub.alert.adbreak.enabled', value: String(d.eventsubAlertAdBreakEnabled), updatedAt: new Date() },
		{ key: 'eventsub.alert.adbreak', value: d.eventsubAlertAdBreak, updatedAt: new Date() },
	]

	if (d.eventsubAlertRaidEnabled !== undefined) {
		keysToUpsert.push({ key: 'eventsub.alert.raid.enabled', value: String(d.eventsubAlertRaidEnabled), updatedAt: new Date() })
	}
	if (d.eventsubAlertLiveEnabled !== undefined) {
		keysToUpsert.push({ key: 'eventsub.alert.live.enabled', value: String(d.eventsubAlertLiveEnabled), updatedAt: new Date() })
	}
	if (d.eventsubAlertOfflineEnabled !== undefined) {
		keysToUpsert.push({ key: 'eventsub.alert.offline.enabled', value: String(d.eventsubAlertOfflineEnabled), updatedAt: new Date() })
	}
	if (d.eventsubAlertRaid !== undefined) {
		keysToUpsert.push({ key: 'eventsub.alert.raid', value: d.eventsubAlertRaid, updatedAt: new Date() })
	}
	if (d.eventsubAlertLive !== undefined) {
		keysToUpsert.push({ key: 'eventsub.alert.live', value: d.eventsubAlertLive, updatedAt: new Date() })
	}
	if (d.eventsubAlertOffline !== undefined) {
		keysToUpsert.push({ key: 'eventsub.alert.offline', value: d.eventsubAlertOffline, updatedAt: new Date() })
	}

	await db
		.insert(settings)
		.values(keysToUpsert)
		.onConflictDoUpdate({
			target: settings.key,
			set: {
				value: sql`excluded.value`,
				updatedAt: sql`excluded.updated_at`,
			},
		})

	// Dynamic cache reload in memory
	await refreshAppSettingsCache()

	return { success: true }
})
