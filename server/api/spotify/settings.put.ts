import { z } from 'zod'
import { spotifySettings } from '~~/server/settings'
import { requireUserRole } from '~~/server/utils/auth'

const saveSpotifySettingsSchema = z.object({
	active: z.boolean(),
	pointsCost: z.number().int().min(0),
	maxLength: z.number().int().min(0),
	maxQueue: z.number().int().min(0),
	maxUserRequests: z.number().int().min(0),
	modsBypassLimits: z.boolean(),
	followersOnly: z.boolean(),
	permitExplicit: z.boolean(),
	offlineOverride: z.boolean(),
	targetPlaylist: z.string(),
	targetPlaylistName: z.string(),
	allowModerators: z.boolean(),
	whisperNotifications: z.boolean(),
	announceDeleteWebui: z.boolean(),
	alertQueueLowEnabled: z.boolean().default(false),
	alertQueueEmptyEnabled: z.boolean().default(false),
})

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'caster')
	const body = await readBody(event)
	const parsed = saveSpotifySettingsSchema.safeParse(body)

	if (!parsed.success) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid Spotify settings data',
			data: parsed.error.format(),
		})
	}

	const d = parsed.data
	const current = spotifySettings.get()

	if (d.active && !current.requestPlaylistId) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Cannot enable song requests without a song request playlist.',
		})
	}

	if (current.requestPlaylistId && d.targetPlaylist === current.requestPlaylistId) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Cannot set target playlist to the song request/bot playlist.',
		})
	}

	if (d.targetPlaylist !== current.playlistTargetId) {
		const { clearSpotifyTokenCache } = await import('~~/server/utils/spotify')
		clearSpotifyTokenCache()
	}

	await spotifySettings.update({
		songRequestEnabled: d.active,
		songRequestPointsCost: d.pointsCost,
		songRequestMaxLength: d.maxLength,
		songRequestMaxQueue: d.maxQueue,
		songRequestMaxUserRequests: d.maxUserRequests,
		songRequestModsBypassLimits: d.modsBypassLimits,
		songRequestFollowersOnly: d.followersOnly,
		songRequestPermitExplicit: d.permitExplicit,
		songRequestOfflineOverride: d.offlineOverride,
		playlistTargetId: d.targetPlaylist,
		playlistTargetName: d.targetPlaylistName,
		playlistAllowMods: d.allowModerators,
		playlistWhisper: d.whisperNotifications,
		playlistAnnounceDeleteWebui: d.announceDeleteWebui,
		songRequestAlertQueueLowEnabled: d.alertQueueLowEnabled,
		songRequestAlertQueueEmptyEnabled: d.alertQueueEmptyEnabled,
	})

	if (d.targetPlaylist) {
		const { syncTargetPlaylist } = await import('~~/server/utils/spotify')
		syncTargetPlaylist(d.targetPlaylist, true).catch(() => {})
	}

	return { success: true }
})
