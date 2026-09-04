import { z } from 'zod'
import { defineSettingsDomain } from '../registry'

export const AlertsSettingsSchema = z.object({
	eventsubAlertFollowEnabled: z.boolean().default(false),
	eventsubAlertSubEnabled: z.boolean().default(false),
	eventsubAlertGiftEnabled: z.boolean().default(false),
	eventsubAlertCheerEnabled: z.boolean().default(false),
	eventsubAlertRaidEnabled: z.boolean().default(false),
	eventsubAlertLiveEnabled: z.boolean().default(false),
	eventsubAlertOfflineEnabled: z.boolean().default(false),
	eventsubAlertBanEnabled: z.boolean().default(false),
	eventsubAlertTimeoutEnabled: z.boolean().default(false),
	eventsubAlertUnbanEnabled: z.boolean().default(false),
	eventsubAlertMessageDeleteEnabled: z.boolean().default(false),
	eventsubAlertAdBreakEnabled: z.boolean().default(false),

	eventsubPointsFollowEnabled: z.boolean().default(false),
	eventsubPointsSubEnabled: z.boolean().default(false),
	eventsubPointsGiftEnabled: z.boolean().default(false),
	eventsubPointsCheerEnabled: z.boolean().default(false),

	eventsubPointsFollow: z.number().int().min(0, 'Follow reward must be non-negative').default(100),
	eventsubPointsSub: z.number().int().min(0, 'Subscription reward must be non-negative').default(500),
	eventsubPointsGift: z.number().int().min(0, 'Sub-gift reward must be non-negative').default(500),
	eventsubPointsCheer: z.number().int().min(0, 'Cheer multiplier must be non-negative').default(1),
})

export type AlertsSettings = z.infer<typeof AlertsSettingsSchema>

export const alertsSettings = defineSettingsDomain({
	namespace: 'eventsub',
	schema: AlertsSettingsSchema,
	customKeys: {
		eventsubAlertFollowEnabled: 'eventsub.alert.follow.enabled',
		eventsubAlertSubEnabled: 'eventsub.alert.sub.enabled',
		eventsubAlertGiftEnabled: 'eventsub.alert.gift.enabled',
		eventsubAlertCheerEnabled: 'eventsub.alert.cheer.enabled',
		eventsubAlertRaidEnabled: 'eventsub.alert.raid.enabled',
		eventsubAlertLiveEnabled: 'eventsub.alert.live.enabled',
		eventsubAlertOfflineEnabled: 'eventsub.alert.offline.enabled',
		eventsubAlertBanEnabled: 'eventsub.alert.ban.enabled',
		eventsubAlertTimeoutEnabled: 'eventsub.alert.timeout.enabled',
		eventsubAlertUnbanEnabled: 'eventsub.alert.unban.enabled',
		eventsubAlertMessageDeleteEnabled: 'eventsub.alert.message_delete.enabled',
		eventsubAlertAdBreakEnabled: 'eventsub.alert.adbreak.enabled',

		eventsubPointsFollowEnabled: 'eventsub.points.follow.enabled',
		eventsubPointsSubEnabled: 'eventsub.points.sub.enabled',
		eventsubPointsGiftEnabled: 'eventsub.points.gift.enabled',
		eventsubPointsCheerEnabled: 'eventsub.points.cheer.enabled',

		eventsubPointsFollow: 'eventsub.points.follow',
		eventsubPointsSub: 'eventsub.points.sub',
		eventsubPointsGift: 'eventsub.points.gift',
		eventsubPointsCheer: 'eventsub.points.cheer',
	},
})
