import { requireUserRole } from '~~/server/utils/auth'
import { getAppSettings } from '~~/server/utils/settings'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'caster')
	const appSettings = await getAppSettings()

	return {
		active: appSettings.spotifyRequestPlaylistId ? appSettings.spotifySongRequestEnabled : false,
		pointsCost: appSettings.spotifySongRequestPointsCost,
		maxLength: appSettings.spotifySongRequestMaxLength,
		maxQueue: appSettings.spotifySongRequestMaxQueue,
		maxUserRequests: appSettings.spotifySongRequestMaxUserRequests,
		modsBypassLimits: appSettings.spotifySongRequestModsBypassLimits,
		followersOnly: appSettings.spotifySongRequestFollowersOnly,
		permitExplicit: appSettings.spotifySongRequestPermitExplicit,
		offlineOverride: appSettings.spotifySongRequestOfflineOverride,
		targetPlaylist: appSettings.spotifyPlaylistTargetId,
		targetPlaylistName: appSettings.spotifyPlaylistTargetName,
		allowModerators: appSettings.spotifyPlaylistAllowMods,
		whisperNotifications: appSettings.spotifyPlaylistWhisper,
		announceDeleteWebui: appSettings.spotifyPlaylistAnnounceDeleteWebui,
		playlistId: appSettings.spotifyRequestPlaylistId,
	}
})
