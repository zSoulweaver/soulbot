import { spotifySettings } from '~~/server/settings'
import { requireUserRole } from '~~/server/utils/auth'
import { getSpotifyToken, playlistExists } from '~~/server/utils/spotify'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'caster')
	const settings = spotifySettings.get()

	const playlistId = settings.requestPlaylistId
	const token = await getSpotifyToken()
	const connected = !!token

	let playlistExistsVal: boolean | null = null
	if (playlistId) {
		playlistExistsVal = connected ? await playlistExists(playlistId) : null
	}

	return {
		active: playlistId ? settings.songRequestEnabled : false,
		pointsCost: settings.songRequestPointsCost,
		maxLength: settings.songRequestMaxLength,
		maxQueue: settings.songRequestMaxQueue,
		maxUserRequests: settings.songRequestMaxUserRequests,
		modsBypassLimits: settings.songRequestModsBypassLimits,
		followersOnly: settings.songRequestFollowersOnly,
		permitExplicit: settings.songRequestPermitExplicit,
		offlineOverride: settings.songRequestOfflineOverride,
		targetPlaylist: settings.playlistTargetId,
		targetPlaylistName: settings.playlistTargetName,
		allowModerators: settings.playlistAllowMods,
		whisperNotifications: settings.playlistWhisper,
		announceDeleteWebui: settings.playlistAnnounceDeleteWebui,
		alertQueueLowEnabled: settings.songRequestAlertQueueLowEnabled,
		alertQueueEmptyEnabled: settings.songRequestAlertQueueEmptyEnabled,
		playlistId,
		playlistExists: playlistExistsVal,
	}
})
