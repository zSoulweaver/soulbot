import { db } from '~~/server/database'
import { settings } from '~~/server/database/schema'
import { botLogger } from './logger'

export interface AppSettings {
	currencyName: string
	currencyNamePlural: string
	payoutInterval: number
	payoutIntervalOffline: number
	payoutAmount: number
	payoutAmountOffline: number
	activeBonus: number
	streamerTokenVersion: number
	eventsubAlertFollowEnabled: boolean
	eventsubAlertSubEnabled: boolean
	eventsubAlertGiftEnabled: boolean
	eventsubAlertCheerEnabled: boolean
	eventsubPointsFollowEnabled: boolean
	eventsubPointsSubEnabled: boolean
	eventsubPointsGiftEnabled: boolean
	eventsubPointsCheerEnabled: boolean
	eventsubAlertFollow: string
	eventsubAlertSub: string
	eventsubAlertGift: string
	eventsubAlertCheer: string
	eventsubPointsFollow: number
	eventsubPointsSub: number
	eventsubPointsGift: number
	eventsubPointsCheer: number
}

let cachedSettings: AppSettings | null = null

export async function getAppSettings(): Promise<AppSettings> {
	if (!cachedSettings) {
		await refreshAppSettingsCache()
	}
	return cachedSettings!
}

export function getAppSettingsSync(): AppSettings {
	if (!cachedSettings) {
		return {
			currencyName: 'point',
			currencyNamePlural: 'points',
			payoutInterval: 5,
			payoutIntervalOffline: 10,
			payoutAmount: 5,
			payoutAmountOffline: 0,
			activeBonus: 5,
			streamerTokenVersion: 1,
			eventsubAlertFollowEnabled: false,
			eventsubAlertSubEnabled: false,
			eventsubAlertGiftEnabled: false,
			eventsubAlertCheerEnabled: false,
			eventsubPointsFollowEnabled: false,
			eventsubPointsSubEnabled: false,
			eventsubPointsGiftEnabled: false,
			eventsubPointsCheerEnabled: false,
			eventsubAlertFollow: 'Thank you for the follow, $(sender)!',
			eventsubAlertSub: 'Thank you for subscribing, $(sender)! Welcome to the club!',
			eventsubAlertGift: 'Thank you @$(sender) for gifting $(1) sub(s) to the community!',
			eventsubAlertCheer: 'Thank you @$(sender) for cheering $(1) bits! $(2)',
			eventsubPointsFollow: 100,
			eventsubPointsSub: 500,
			eventsubPointsGift: 500,
			eventsubPointsCheer: 1,
		}
	}
	return cachedSettings
}

export async function refreshAppSettingsCache(): Promise<void> {
	try {
		const dbSettings = await db.select().from(settings)
		const getVal = (key: string, fallback: string) => dbSettings.find(s => s.key === key)?.value ?? fallback

		cachedSettings = {
			currencyName: getVal('points.currency_name', 'point'),
			currencyNamePlural: getVal('points.currency_name_plural', 'points'),
			payoutInterval: Math.max(1, Number(getVal('points.payout_interval', '5'))),
			payoutIntervalOffline: Math.max(1, Number(getVal('points.payout_interval_offline', '10'))),
			payoutAmount: Math.max(0, Number(getVal('points.payout_amount', '5'))),
			payoutAmountOffline: Math.max(0, Number(getVal('points.payout_amount_offline', '0'))),
			activeBonus: Math.max(0, Number(getVal('points.active_bonus', '5'))),
			streamerTokenVersion: Number(getVal('twitch.streamer_token_version', '1')),
			eventsubAlertFollowEnabled: getVal('eventsub.alert.follow.enabled', 'false') === 'true',
			eventsubAlertSubEnabled: getVal('eventsub.alert.sub.enabled', 'false') === 'true',
			eventsubAlertGiftEnabled: getVal('eventsub.alert.gift.enabled', 'false') === 'true',
			eventsubAlertCheerEnabled: getVal('eventsub.alert.cheer.enabled', 'false') === 'true',
			eventsubPointsFollowEnabled: getVal('eventsub.points.follow.enabled', 'false') === 'true',
			eventsubPointsSubEnabled: getVal('eventsub.points.sub.enabled', 'false') === 'true',
			eventsubPointsGiftEnabled: getVal('eventsub.points.gift.enabled', 'false') === 'true',
			eventsubPointsCheerEnabled: getVal('eventsub.points.cheer.enabled', 'false') === 'true',
			eventsubAlertFollow: getVal('eventsub.alert.follow', 'Thank you for the follow, $(sender)!'),
			eventsubAlertSub: getVal('eventsub.alert.sub', 'Thank you for subscribing, $(sender)! Welcome to the club!'),
			eventsubAlertGift: getVal('eventsub.alert.gift', 'Thank you @$(sender) for gifting $(giftCount) sub(s) to the community!'),
			eventsubAlertCheer: getVal('eventsub.alert.cheer', 'Thank you @$(sender) for cheering $(bitsCount) bits! $(cheerMessage)'),
			eventsubPointsFollow: Math.max(0, Number(getVal('eventsub.points.follow', '100'))),
			eventsubPointsSub: Math.max(0, Number(getVal('eventsub.points.sub', '500'))),
			eventsubPointsGift: Math.max(0, Number(getVal('eventsub.points.gift', '500'))),
			eventsubPointsCheer: Math.max(0, Number(getVal('eventsub.points.cheer', '1'))),
		}
	}
	catch (err) {
		botLogger.error({ err }, 'Failed to refresh app settings cache')
	}
}
