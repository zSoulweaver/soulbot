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
	eventsubAlertFollow: string
	eventsubAlertSub: string
	eventsubAlertGift: string
	eventsubAlertCheer: string
	eventsubAlertRaid: string
	eventsubAlertLive: string
	eventsubAlertOffline: string
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
	pointsGamblingBonusMessage: string
	pointsGamblingBonusEndMessage: string
	pointsGamblingBonusEndTime: number
	pointsVaultMinBet: number
	pointsVaultMaxBet: number
	pointsVaultWinMinRoll: number
	pointsVaultWinMultiplier: number
	pointsVaultDuration: number
	pointsVaultWarningEnabled: boolean
	pointsVaultEndTime: number
	pointsVaultStartMessage: string
	pointsVaultWarningMessage: string
	pointsVaultEndWinMessage: string
	pointsVaultEndLoseMessage: string
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
	discordAlertFollowTemplate: string
	discordAlertSubEnabled: boolean
	discordAlertSubChannelId: string
	discordAlertSubTemplate: string
	discordAlertGiftEnabled: boolean
	discordAlertGiftChannelId: string
	discordAlertGiftTemplate: string
	discordAlertCheerEnabled: boolean
	discordAlertCheerChannelId: string
	discordAlertCheerTemplate: string
	discordAlertRaidEnabled: boolean
	discordAlertRaidChannelId: string
	discordAlertRaidTemplate: string
	discordAlertLiveEnabled: boolean
	discordAlertLiveChannelId: string
	discordAlertLiveTemplate: string
	discordAlertLiveRemoveOffline: boolean
	discordAlertLiveLastMessageId: string
	discordAlertLiveLastChannelId: string
	discordAlertOfflineEnabled: boolean
	discordAlertOfflineChannelId: string
	discordAlertOfflineTemplate: string
	discordAlertBanEnabled: boolean
	discordAlertBanChannelId: string
	discordAlertBanTemplate: string
	discordAlertTimeoutEnabled: boolean
	discordAlertTimeoutChannelId: string
	discordAlertTimeoutTemplate: string
	discordAlertUnbanEnabled: boolean
	discordAlertUnbanChannelId: string
	discordAlertUnbanTemplate: string
	discordAlertMessageDeleteEnabled: boolean
	discordAlertMessageDeleteChannelId: string
	discordAlertMessageDeleteTemplate: string
	discordModerationLogEnabled: boolean
	discordModerationLogChannelId: string
	discordEventJoinEnabled: boolean
	discordEventJoinChannelId: string
	discordEventJoinTemplate: string
	discordEventLeaveEnabled: boolean
	discordEventLeaveChannelId: string
	discordEventLeaveTemplate: string
	eventsubAlertBanEnabled: boolean
	eventsubAlertBan: string
	eventsubAlertTimeoutEnabled: boolean
	eventsubAlertTimeout: string
	eventsubAlertUnbanEnabled: boolean
	eventsubAlertUnban: string
	eventsubAlertMessageDeleteEnabled: boolean
	eventsubAlertMessageDelete: string
	adsAlertsEnabled: boolean
	adsAlert5mEnabled: boolean
	adsAlert3mEnabled: boolean
	adsAlert1mEnabled: boolean
	adsAlertTemplate: string
	eventsubAlertAdBreakEnabled: boolean
	eventsubAlertAdBreak: string
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
		pointsGamblingBonusMessage: gmb.bonusMessage,
		pointsGamblingBonusEndMessage: gmb.bonusEndMessage,
		pointsGamblingBonusEndTime: gmb.bonusEndTime,

		pointsVaultMinBet: vlt.minBet,
		pointsVaultMaxBet: vlt.maxBet,
		pointsVaultWinMinRoll: vlt.winMinRoll,
		pointsVaultWinMultiplier: vlt.winMultiplier,
		pointsVaultDuration: vlt.duration,
		pointsVaultWarningEnabled: vlt.warningEnabled,
		pointsVaultEndTime: vlt.endTime,
		pointsVaultStartMessage: vlt.startMessage,
		pointsVaultWarningMessage: vlt.warningMessage,
		pointsVaultEndWinMessage: vlt.endWinMessage,
		pointsVaultEndLoseMessage: vlt.endLoseMessage,

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
		discordEventJoinTemplate: dsc.eventJoinTemplate,
		discordEventLeaveEnabled: dsc.eventLeaveEnabled,
		discordEventLeaveChannelId: dsc.eventLeaveChannelId,
		discordEventLeaveTemplate: dsc.eventLeaveTemplate,
		discordAlertFollowEnabled: dsc.alertFollowEnabled,
		discordAlertFollowChannelId: dsc.alertFollowChannelId,
		discordAlertFollowTemplate: dsc.alertFollowTemplate,
		discordAlertSubEnabled: dsc.alertSubEnabled,
		discordAlertSubChannelId: dsc.alertSubChannelId,
		discordAlertSubTemplate: dsc.alertSubTemplate,
		discordAlertGiftEnabled: dsc.alertGiftEnabled,
		discordAlertGiftChannelId: dsc.alertGiftChannelId,
		discordAlertGiftTemplate: dsc.alertGiftTemplate,
		discordAlertCheerEnabled: dsc.alertCheerEnabled,
		discordAlertCheerChannelId: dsc.alertCheerChannelId,
		discordAlertCheerTemplate: dsc.alertCheerTemplate,
		discordAlertRaidEnabled: dsc.alertRaidEnabled,
		discordAlertRaidChannelId: dsc.alertRaidChannelId,
		discordAlertRaidTemplate: dsc.alertRaidTemplate,
		discordAlertLiveEnabled: dsc.alertLiveEnabled,
		discordAlertLiveChannelId: dsc.alertLiveChannelId,
		discordAlertLiveTemplate: dsc.alertLiveTemplate,
		discordAlertLiveRemoveOffline: dsc.alertLiveRemoveOffline,
		discordAlertLiveLastMessageId: dsc.alertLiveLastMessageId,
		discordAlertLiveLastChannelId: dsc.alertLiveLastChannelId,
		discordAlertOfflineEnabled: dsc.alertOfflineEnabled,
		discordAlertOfflineChannelId: dsc.alertOfflineChannelId,
		discordAlertOfflineTemplate: dsc.alertOfflineTemplate,
		discordAlertBanEnabled: dsc.alertBanEnabled,
		discordAlertBanChannelId: dsc.alertBanChannelId,
		discordAlertBanTemplate: dsc.alertBanTemplate,
		discordAlertTimeoutEnabled: dsc.alertTimeoutEnabled,
		discordAlertTimeoutChannelId: dsc.alertTimeoutChannelId,
		discordAlertTimeoutTemplate: dsc.alertTimeoutTemplate,
		discordAlertUnbanEnabled: dsc.alertUnbanEnabled,
		discordAlertUnbanChannelId: dsc.alertUnbanChannelId,
		discordAlertUnbanTemplate: dsc.alertUnbanTemplate,
		discordAlertMessageDeleteEnabled: dsc.alertMessageDeleteEnabled,
		discordAlertMessageDeleteChannelId: dsc.alertMessageDeleteChannelId,
		discordAlertMessageDeleteTemplate: dsc.alertMessageDeleteTemplate,

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

		eventsubAlertFollow: alr.eventsubAlertFollow,
		eventsubAlertSub: alr.eventsubAlertSub,
		eventsubAlertGift: alr.eventsubAlertGift,
		eventsubAlertCheer: alr.eventsubAlertCheer,
		eventsubAlertRaid: alr.eventsubAlertRaid,
		eventsubAlertLive: alr.eventsubAlertLive,
		eventsubAlertOffline: alr.eventsubAlertOffline,
		eventsubAlertBan: alr.eventsubAlertBan,
		eventsubAlertTimeout: alr.eventsubAlertTimeout,
		eventsubAlertUnban: alr.eventsubAlertUnban,
		eventsubAlertMessageDelete: alr.eventsubAlertMessageDelete,
		eventsubAlertAdBreak: alr.eventsubAlertAdBreak,

		eventsubPointsFollow: alr.eventsubPointsFollow,
		eventsubPointsSub: alr.eventsubPointsSub,
		eventsubPointsGift: alr.eventsubPointsGift,
		eventsubPointsCheer: alr.eventsubPointsCheer,

		adsAlertsEnabled: ads.adsAlertsEnabled,
		adsAlert5mEnabled: ads.adsAlert5mEnabled,
		adsAlert3mEnabled: ads.adsAlert3mEnabled,
		adsAlert1mEnabled: ads.adsAlert1mEnabled,
		adsAlertTemplate: ads.adsAlertTemplate,
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
