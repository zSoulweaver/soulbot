import { z } from 'zod'
import { defineSettingsDomain } from '../registry'

export const SpotifySettingsSchema = z.object({
	songRequestEnabled: z.boolean().default(true),
	songRequestPointsCost: z.number().int().min(0).default(10),
	songRequestMaxLength: z.number().int().min(0).default(8),
	songRequestMaxQueue: z.number().int().min(0).default(50),
	songRequestMaxUserRequests: z.number().int().min(0).default(0),
	songRequestModsBypassLimits: z.boolean().default(true),
	songRequestFollowersOnly: z.boolean().default(false),
	songRequestPermitExplicit: z.boolean().default(true),
	songRequestOfflineOverride: z.boolean().default(false),
	songRequestAlertQueueLowEnabled: z.boolean().default(false),
	songRequestAlertQueueEmptyEnabled: z.boolean().default(false),
	playlistTargetId: z.string().default(''),
	playlistTargetName: z.string().default(''),
	playlistAllowMods: z.boolean().default(true),
	playlistWhisper: z.boolean().default(false),
	requestPlaylistId: z.string().default(''),
	playlistAnnounceDeleteWebui: z.boolean().default(true),
})

export type SpotifySettings = z.infer<typeof SpotifySettingsSchema>

export const spotifySettings = defineSettingsDomain({
	namespace: 'spotify',
	schema: SpotifySettingsSchema,
	customKeys: {
		songRequestEnabled: 'spotify.sr.enabled',
		songRequestPointsCost: 'spotify.sr.points_cost',
		songRequestMaxLength: 'spotify.sr.max_length',
		songRequestMaxQueue: 'spotify.sr.max_queue',
		songRequestMaxUserRequests: 'spotify.sr.max_user_requests',
		songRequestModsBypassLimits: 'spotify.sr.mods_bypass_limits',
		songRequestFollowersOnly: 'spotify.sr.followers_only',
		songRequestPermitExplicit: 'spotify.sr.permit_explicit',
		songRequestOfflineOverride: 'spotify.sr.offline_override',
		songRequestAlertQueueLowEnabled: 'spotify.sr.alert_queue_low_enabled',
		songRequestAlertQueueEmptyEnabled: 'spotify.sr.alert_queue_empty_enabled',
		playlistTargetId: 'spotify.playlist.target_id',
		playlistTargetName: 'spotify.playlist.target_name',
		playlistAllowMods: 'spotify.playlist.allow_mods',
		playlistWhisper: 'spotify.playlist.whisper',
		requestPlaylistId: 'spotify.request.playlist_id',
		playlistAnnounceDeleteWebui: 'spotify.playlist.announce_delete_webui',
	},
})
