import { requireUserRole } from '~~/server/utils/auth'
import { getAppSettings } from '~~/server/utils/settings'
import { getSpotifyToken, playlistExists } from '~~/server/utils/spotify'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'caster')
	const appSettings = await getAppSettings()

	const playlistId = appSettings.spotifyRequestPlaylistId
	const token = await getSpotifyToken()
	const connected = !!token

	let playlistExistsVal: boolean | null = null
	if (playlistId) {
		playlistExistsVal = connected ? await playlistExists(playlistId) : null
	}

	return {
		active: playlistId ? appSettings.spotifySongRequestEnabled : false,
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
		alertQueueLowEnabled: appSettings.spotifySongRequestAlertQueueLowEnabled,
		alertQueueEmptyEnabled: appSettings.spotifySongRequestAlertQueueEmptyEnabled,
		playlistId,
		playlistExists: playlistExistsVal,
	}
})
