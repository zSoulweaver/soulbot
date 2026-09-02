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

	eventsubAlertFollow: z.string().max(500, 'Follow alert template is too long').default('Thank you for the follow, $(follower)!'),
	eventsubAlertSub: z.string().max(500, 'Subscription alert template is too long').default('Thank you for subscribing, $(subscriber)! Welcome to the club!'),
	eventsubAlertGift: z.string().max(500, 'Sub-gift alert template is too long').default('Thank you @$(gifter) for gifting $(count) sub(s) to the community!'),
	eventsubAlertCheer: z.string().max(500, 'Cheer alert template is too long').default('Thank you @$(cheerer) for cheering $(bits) bits! $(message)'),
	eventsubAlertRaid: z.string().max(500, 'Raid alert template is too long').default('Thank you for the raid, $(raider) with $(viewers) viewers!'),
	eventsubAlertLive: z.string().max(500, 'Live alert template is too long').default('We are now live playing $(game) - $(title)!'),
	eventsubAlertOffline: z.string().max(500, 'Offline alert template is too long').default('Stream has ended. Thanks for hanging out!'),
	eventsubAlertBan: z.string().max(500, 'Ban alert template is too long').default('$(target) has been banned from the channel.'),
	eventsubAlertTimeout: z.string().max(500, 'Timeout alert template is too long').default('$(target) has been timed out for $(duration) seconds.'),
	eventsubAlertUnban: z.string().max(500, 'Unban alert template is too long').default('$(target) has been unbanned.'),
	eventsubAlertMessageDelete: z.string().max(500, 'Message delete alert template is too long').default('A message from $(target) was deleted.'),
	eventsubAlertAdBreak: z.string().max(500, 'Ad break alert template is too long').default('An ad break of $(duration) seconds has started!'),

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

		eventsubAlertFollow: 'eventsub.alert.follow',
		eventsubAlertSub: 'eventsub.alert.sub',
		eventsubAlertGift: 'eventsub.alert.gift',
		eventsubAlertCheer: 'eventsub.alert.cheer',
		eventsubAlertRaid: 'eventsub.alert.raid',
		eventsubAlertLive: 'eventsub.alert.live',
		eventsubAlertOffline: 'eventsub.alert.offline',
		eventsubAlertBan: 'eventsub.alert.ban',
		eventsubAlertTimeout: 'eventsub.alert.timeout',
		eventsubAlertUnban: 'eventsub.alert.unban',
		eventsubAlertMessageDelete: 'eventsub.alert.message_delete',
		eventsubAlertAdBreak: 'eventsub.alert.adbreak',

		eventsubPointsFollow: 'eventsub.points.follow',
		eventsubPointsSub: 'eventsub.points.sub',
		eventsubPointsGift: 'eventsub.points.gift',
		eventsubPointsCheer: 'eventsub.points.cheer',
	},
})
