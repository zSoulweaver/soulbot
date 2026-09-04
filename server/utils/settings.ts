import { db } from '~~/server/database'
import { settings } from '~~/server/database/schema'
import {
	adsSettings,
	alertsSettings,
	botSettings,
	discordSettings,
	gamblingSettings,
	pointsSettings,
	settingsRegistry,
	spotifySettings,
	vaultSettings,
} from '~~/server/settings'
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
	botTokenVersion: number
	eventsubAlertFollowEnabled: boolean
	eventsubAlertSubEnabled: boolean
	eventsubAlertGiftEnabled: boolean
	eventsubAlertCheerEnabled: boolean
	eventsubAlertRaidEnabled: boolean
	eventsubAlertLiveEnabled: boolean
	eventsubAlertOfflineEnabled: boolean
	eventsubPointsFollowEnabled: boolean
	eventsubPointsSubEnabled: boolean
	eventsubPointsGiftEnabled: boolean
	eventsubPointsCheerEnabled: boolean
	eventsubPointsFollow: number
	eventsubPointsSub: number
	eventsubPointsGift: number
	eventsubPointsCheer: number
	pointsGamblingMinBet: number
	pointsGamblingMaxBet: number
	pointsGamblingWinMinRoll: number
	pointsGamblingWinMultiplier: number
	pointsGamblingBonusDuration: number
	pointsGamblingBonusWinMultiplier: number
	pointsGamblingBonusWinMinRoll: number
	pointsGamblingBonusTicketsPerUser: number
	pointsGamblingBonusEndTime: number
	pointsVaultMinBet: number
	pointsVaultMaxBet: number
	pointsVaultWinMinRoll: number
	pointsVaultWinMultiplier: number
	pointsVaultDuration: number
	pointsVaultWarningEnabled: boolean
	pointsVaultEndTime: number
	spotifySongRequestEnabled: boolean
	spotifySongRequestPointsCost: number
	spotifySongRequestMaxLength: number
	spotifySongRequestMaxQueue: number
	spotifySongRequestMaxUserRequests: number
	spotifySongRequestModsBypassLimits: boolean
	spotifySongRequestFollowersOnly: boolean
	spotifySongRequestPermitExplicit: boolean
	spotifySongRequestOfflineOverride: boolean
	spotifyPlaylistTargetId: string
	spotifyPlaylistTargetName: string
	spotifyPlaylistAllowMods: boolean
	spotifyPlaylistWhisper: boolean
	spotifyRequestPlaylistId: string
	spotifyPlaylistAnnounceDeleteWebui: boolean
	spotifySongRequestAlertQueueLowEnabled: boolean
	spotifySongRequestAlertQueueEmptyEnabled: boolean
	botChatMode: 'normal' | 'action'
	botMuted: boolean
	discordEnabled: boolean
	discordGuildId: string
	discordRolesAutoBestowEnabled: boolean
	discordRolesAutoBestowRoles: string
	discordAlertFollowEnabled: boolean
	discordAlertFollowChannelId: string
	discordAlertSubEnabled: boolean
	discordAlertSubChannelId: string
	discordAlertGiftEnabled: boolean
	discordAlertGiftChannelId: string
	discordAlertCheerEnabled: boolean
	discordAlertCheerChannelId: string
	discordAlertRaidEnabled: boolean
	discordAlertRaidChannelId: string
	discordAlertLiveEnabled: boolean
	discordAlertLiveChannelId: string
	discordAlertLiveRemoveOffline: boolean
	discordAlertLiveLastMessageId: string
	discordAlertLiveLastChannelId: string
	discordAlertOfflineEnabled: boolean
	discordAlertOfflineChannelId: string
	discordAlertBanEnabled: boolean
	discordAlertBanChannelId: string
	discordAlertTimeoutEnabled: boolean
	discordAlertTimeoutChannelId: string
	discordAlertUnbanEnabled: boolean
	discordAlertUnbanChannelId: string
	discordAlertMessageDeleteEnabled: boolean
	discordAlertMessageDeleteChannelId: string
	discordModerationLogEnabled: boolean
	discordModerationLogChannelId: string
	discordEventJoinEnabled: boolean
	discordEventJoinChannelId: string
	discordEventLeaveEnabled: boolean
	discordEventLeaveChannelId: string
	eventsubAlertBanEnabled: boolean
	eventsubAlertTimeoutEnabled: boolean
	eventsubAlertUnbanEnabled: boolean
	eventsubAlertMessageDeleteEnabled: boolean
	adsAlertsEnabled: boolean
	adsAlert5mEnabled: boolean
	adsAlert3mEnabled: boolean
	adsAlert1mEnabled: boolean
	eventsubAlertAdBreakEnabled: boolean
}

let isWarmedUp = false

export async function getAppSettings(): Promise<AppSettings> {
	if (!isWarmedUp) {
		await refreshAppSettingsCache()
	}
	return getAppSettingsSync()
}

export function getAppSettingsSync(): AppSettings {
	const pts = pointsSettings.get()
	const gmb = gamblingSettings.get()
	const vlt = vaultSettings.get()
	const spt = spotifySettings.get()
	const dsc = discordSettings.get()
	const alr = alertsSettings.get()
	const ads = adsSettings.get()
	const bot = botSettings.get()

	return {
		currencyName: pts.currencyName,
		currencyNamePlural: pts.currencyNamePlural,
		payoutInterval: pts.payoutInterval,
		payoutIntervalOffline: pts.payoutIntervalOffline,
		payoutAmount: pts.payoutAmount,
		payoutAmountOffline: pts.payoutAmountOffline,
		activeBonus: pts.activeBonus,

		streamerTokenVersion: bot.streamerTokenVersion,
		botTokenVersion: bot.botTokenVersion,
		botChatMode: bot.botChatMode,
		botMuted: bot.botMuted,

		pointsGamblingMinBet: gmb.minBet,
		pointsGamblingMaxBet: gmb.maxBet,
		pointsGamblingWinMinRoll: gmb.winMinRoll,
		pointsGamblingWinMultiplier: gmb.winMultiplier,
		pointsGamblingBonusDuration: gmb.bonusDuration,
		pointsGamblingBonusWinMultiplier: gmb.bonusWinMultiplier,
		pointsGamblingBonusWinMinRoll: gmb.bonusWinMinRoll,
		pointsGamblingBonusTicketsPerUser: gmb.bonusTicketsPerUser,
		pointsGamblingBonusEndTime: gmb.bonusEndTime,

		pointsVaultMinBet: vlt.minBet,
		pointsVaultMaxBet: vlt.maxBet,
		pointsVaultWinMinRoll: vlt.winMinRoll,
		pointsVaultWinMultiplier: vlt.winMultiplier,
		pointsVaultDuration: vlt.duration,
		pointsVaultWarningEnabled: vlt.warningEnabled,
		pointsVaultEndTime: vlt.endTime,

		spotifySongRequestEnabled: spt.songRequestEnabled,
		spotifySongRequestPointsCost: spt.songRequestPointsCost,
		spotifySongRequestMaxLength: spt.songRequestMaxLength,
		spotifySongRequestMaxQueue: spt.songRequestMaxQueue,
		spotifySongRequestMaxUserRequests: spt.songRequestMaxUserRequests,
		spotifySongRequestModsBypassLimits: spt.songRequestModsBypassLimits,
		spotifySongRequestFollowersOnly: spt.songRequestFollowersOnly,
		spotifySongRequestPermitExplicit: spt.songRequestPermitExplicit,
		spotifySongRequestOfflineOverride: spt.songRequestOfflineOverride,
		spotifyPlaylistTargetId: spt.playlistTargetId,
		spotifyPlaylistTargetName: spt.playlistTargetName,
		spotifyPlaylistAllowMods: spt.playlistAllowMods,
		spotifyPlaylistWhisper: spt.playlistWhisper,
		spotifyRequestPlaylistId: spt.requestPlaylistId,
		spotifyPlaylistAnnounceDeleteWebui: spt.playlistAnnounceDeleteWebui,
		spotifySongRequestAlertQueueLowEnabled: spt.songRequestAlertQueueLowEnabled,
		spotifySongRequestAlertQueueEmptyEnabled: spt.songRequestAlertQueueEmptyEnabled,

		discordEnabled: dsc.enabled,
		discordGuildId: dsc.guildId,
		discordRolesAutoBestowEnabled: dsc.rolesAutoBestowEnabled,
		discordRolesAutoBestowRoles: dsc.rolesAutoBestowRoles,
		discordModerationLogEnabled: dsc.moderationLogEnabled,
		discordModerationLogChannelId: dsc.moderationLogChannelId,
		discordEventJoinEnabled: dsc.eventJoinEnabled,
		discordEventJoinChannelId: dsc.eventJoinChannelId,
		discordEventLeaveEnabled: dsc.eventLeaveEnabled,
		discordEventLeaveChannelId: dsc.eventLeaveChannelId,
		discordAlertFollowEnabled: dsc.alertFollowEnabled,
		discordAlertFollowChannelId: dsc.alertFollowChannelId,
		discordAlertSubEnabled: dsc.alertSubEnabled,
		discordAlertSubChannelId: dsc.alertSubChannelId,
		discordAlertGiftEnabled: dsc.alertGiftEnabled,
		discordAlertGiftChannelId: dsc.alertGiftChannelId,
		discordAlertCheerEnabled: dsc.alertCheerEnabled,
		discordAlertCheerChannelId: dsc.alertCheerChannelId,
		discordAlertRaidEnabled: dsc.alertRaidEnabled,
		discordAlertRaidChannelId: dsc.alertRaidChannelId,
		discordAlertLiveEnabled: dsc.alertLiveEnabled,
		discordAlertLiveChannelId: dsc.alertLiveChannelId,
		discordAlertLiveRemoveOffline: dsc.alertLiveRemoveOffline,
		discordAlertLiveLastMessageId: dsc.alertLiveLastMessageId,
		discordAlertLiveLastChannelId: dsc.alertLiveLastChannelId,
		discordAlertOfflineEnabled: dsc.alertOfflineEnabled,
		discordAlertOfflineChannelId: dsc.alertOfflineChannelId,
		discordAlertBanEnabled: dsc.alertBanEnabled,
		discordAlertBanChannelId: dsc.alertBanChannelId,
		discordAlertTimeoutEnabled: dsc.alertTimeoutEnabled,
		discordAlertTimeoutChannelId: dsc.alertTimeoutChannelId,
		discordAlertUnbanEnabled: dsc.alertUnbanEnabled,
		discordAlertUnbanChannelId: dsc.alertUnbanChannelId,
		discordAlertMessageDeleteEnabled: dsc.alertMessageDeleteEnabled,
		discordAlertMessageDeleteChannelId: dsc.alertMessageDeleteChannelId,

		eventsubAlertFollowEnabled: alr.eventsubAlertFollowEnabled,
		eventsubAlertSubEnabled: alr.eventsubAlertSubEnabled,
		eventsubAlertGiftEnabled: alr.eventsubAlertGiftEnabled,
		eventsubAlertCheerEnabled: alr.eventsubAlertCheerEnabled,
		eventsubAlertRaidEnabled: alr.eventsubAlertRaidEnabled,
		eventsubAlertLiveEnabled: alr.eventsubAlertLiveEnabled,
		eventsubAlertOfflineEnabled: alr.eventsubAlertOfflineEnabled,
		eventsubAlertBanEnabled: alr.eventsubAlertBanEnabled,
		eventsubAlertTimeoutEnabled: alr.eventsubAlertTimeoutEnabled,
		eventsubAlertUnbanEnabled: alr.eventsubAlertUnbanEnabled,
		eventsubAlertMessageDeleteEnabled: alr.eventsubAlertMessageDeleteEnabled,
		eventsubAlertAdBreakEnabled: alr.eventsubAlertAdBreakEnabled,

		eventsubPointsFollowEnabled: alr.eventsubPointsFollowEnabled,
		eventsubPointsSubEnabled: alr.eventsubPointsSubEnabled,
		eventsubPointsGiftEnabled: alr.eventsubPointsGiftEnabled,
		eventsubPointsCheerEnabled: alr.eventsubPointsCheerEnabled,

		eventsubPointsFollow: alr.eventsubPointsFollow,
		eventsubPointsSub: alr.eventsubPointsSub,
		eventsubPointsGift: alr.eventsubPointsGift,
		eventsubPointsCheer: alr.eventsubPointsCheer,

		adsAlertsEnabled: ads.adsAlertsEnabled,
		adsAlert5mEnabled: ads.adsAlert5mEnabled,
		adsAlert3mEnabled: ads.adsAlert3mEnabled,
		adsAlert1mEnabled: ads.adsAlert1mEnabled,
	}
}

export async function refreshAppSettingsCache(): Promise<void> {
	try {
		await settingsRegistry.warmup()
		isWarmedUp = true
	}
	catch (err) {
		botLogger.error({ err }, 'Failed to refresh app settings cache')
	}
}

export async function updateAppSetting(key: string, value: string): Promise<void> {
	await db
		.insert(settings)
		.values({ key, value, updatedAt: new Date() })
		.onConflictDoUpdate({
			target: settings.key,
			set: {
				value,
				updatedAt: new Date(),
			},
		})
	await refreshAppSettingsCache()
}
