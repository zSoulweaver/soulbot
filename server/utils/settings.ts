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
	botTokenVersion: number
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
	pointsGamblingMinBet: number
	pointsGamblingMaxBet: number
	pointsGamblingWinMinRoll: number
	pointsGamblingWinMultiplier: number
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
			botTokenVersion: 1,
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
			pointsGamblingMinBet: 5,
			pointsGamblingMaxBet: 100000,
			pointsGamblingWinMinRoll: 50,
			pointsGamblingWinMultiplier: 1.0,
			spotifySongRequestEnabled: true,
			spotifySongRequestPointsCost: 10,
			spotifySongRequestMaxLength: 8,
			spotifySongRequestMaxQueue: 50,
			spotifySongRequestMaxUserRequests: 0,
			spotifySongRequestModsBypassLimits: true,
			spotifySongRequestFollowersOnly: false,
			spotifySongRequestPermitExplicit: true,
			spotifySongRequestOfflineOverride: false,
			spotifyPlaylistTargetId: '',
			spotifyPlaylistTargetName: '',
			spotifyPlaylistAllowMods: true,
			spotifyPlaylistWhisper: false,
			spotifyRequestPlaylistId: '',
			spotifyPlaylistAnnounceDeleteWebui: true,
			botChatMode: 'action',
			botMuted: false,
			discordEnabled: false,
			discordGuildId: '',
			discordRolesAutoBestowEnabled: false,
			discordRolesAutoBestowRoles: '',
			discordAlertFollowEnabled: false,
			discordAlertFollowChannelId: '',
			discordAlertFollowTemplate: 'Thank you for the follow, $(sender)!',
			discordAlertSubEnabled: false,
			discordAlertSubChannelId: '',
			discordAlertSubTemplate: 'Thank you for subscribing, $(sender)! Welcome to the club!',
			discordAlertGiftEnabled: false,
			discordAlertGiftChannelId: '',
			discordAlertGiftTemplate: 'Thank you @$(sender) for gifting $(giftCount) sub(s) to the community!',
			discordAlertCheerEnabled: false,
			discordAlertCheerChannelId: '',
			discordAlertCheerTemplate: 'Thank you @$(sender) for cheering $(bitsCount) bits! $(cheerMessage)',
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
			botTokenVersion: Number(getVal('twitch.bot_token_version', '1')),
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
			pointsGamblingMinBet: Math.max(1, Number(getVal('points.gambling_min_bet', '10'))),
			pointsGamblingMaxBet: Math.max(1, Number(getVal('points.gambling_max_bet', '100000'))),
			pointsGamblingWinMinRoll: Math.max(1, Math.min(100, Number(getVal('points.gambling_win_min_roll', '50')))),
			pointsGamblingWinMultiplier: Math.max(0.1, Number(getVal('points.gambling_win_multiplier', '1.0'))),
			spotifySongRequestEnabled: getVal('spotify.sr.enabled', 'true') === 'true',
			spotifySongRequestPointsCost: Math.max(0, Number(getVal('spotify.sr.points_cost', '10'))),
			spotifySongRequestMaxLength: Math.max(0, Number(getVal('spotify.sr.max_length', '8'))),
			spotifySongRequestMaxQueue: Math.max(0, Number(getVal('spotify.sr.max_queue', '50'))),
			spotifySongRequestMaxUserRequests: Math.max(0, Number(getVal('spotify.sr.max_user_requests', '0'))),
			spotifySongRequestModsBypassLimits: getVal('spotify.sr.mods_bypass_limits', 'true') === 'true',
			spotifySongRequestFollowersOnly: getVal('spotify.sr.followers_only', 'false') === 'true',
			spotifySongRequestPermitExplicit: getVal('spotify.sr.permit_explicit', 'true') === 'true',
			spotifySongRequestOfflineOverride: getVal('spotify.sr.offline_override', 'false') === 'true',
			spotifyPlaylistTargetId: getVal('spotify.playlist.target_id', ''),
			spotifyPlaylistTargetName: getVal('spotify.playlist.target_name', ''),
			spotifyPlaylistAllowMods: getVal('spotify.playlist.allow_mods', 'true') === 'true',
			spotifyPlaylistWhisper: getVal('spotify.playlist.whisper', 'false') === 'true',
			spotifyRequestPlaylistId: getVal('spotify.request.playlist_id', ''),
			spotifyPlaylistAnnounceDeleteWebui: getVal('spotify.playlist.announce_delete_webui', 'true') === 'true',
			botChatMode: getVal('bot.chat_mode', 'action') as 'normal' | 'action',
			botMuted: getVal('bot.muted', 'false') === 'true',
			discordEnabled: getVal('discord.enabled', 'false') === 'true',
			discordGuildId: getVal('discord.guild_id', ''),
			discordRolesAutoBestowEnabled: getVal('discord.roles.auto_bestow_enabled', 'false') === 'true',
			discordRolesAutoBestowRoles: getVal('discord.roles.auto_bestow_roles', ''),
			discordAlertFollowEnabled: getVal('discord.alerts.follow.enabled', 'false') === 'true',
			discordAlertFollowChannelId: getVal('discord.alerts.follow.channel_id', ''),
			discordAlertFollowTemplate: getVal('discord.alerts.follow.template', 'Thank you for the follow, $(sender)!'),
			discordAlertSubEnabled: getVal('discord.alerts.sub.enabled', 'false') === 'true',
			discordAlertSubChannelId: getVal('discord.alerts.sub.channel_id', ''),
			discordAlertSubTemplate: getVal('discord.alerts.sub.template', 'Thank you for subscribing, $(sender)! Welcome to the club!'),
			discordAlertGiftEnabled: getVal('discord.alerts.gift.enabled', 'false') === 'true',
			discordAlertGiftChannelId: getVal('discord.alerts.gift.channel_id', ''),
			discordAlertGiftTemplate: getVal('discord.alerts.gift.template', 'Thank you @$(sender) for gifting $(giftCount) sub(s) to the community!'),
			discordAlertCheerEnabled: getVal('discord.alerts.cheer.enabled', 'false') === 'true',
			discordAlertCheerChannelId: getVal('discord.alerts.cheer.channel_id', ''),
			discordAlertCheerTemplate: getVal('discord.alerts.cheer.template', 'Thank you @$(sender) for cheering $(bitsCount) bits! $(cheerMessage)'),
		}
	}
	catch (err) {
		botLogger.error({ err }, 'Failed to refresh app settings cache')
	}
}
