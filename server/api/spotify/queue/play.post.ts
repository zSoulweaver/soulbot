import { requireUserRole } from '~~/server/utils/auth'
import { getAppSettings } from '~~/server/utils/settings'
import { getValidSpotifyToken } from '~~/server/utils/spotify'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'caster')

	const appSettings = await getAppSettings()
	if (!appSettings.spotifyRequestPlaylistId) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Song request playlist is not initialized.',
		})
	}

	const token = await getValidSpotifyToken()
	if (!token) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Spotify account not connected',
		})
	}

	try {
		await $fetch('https://api.spotify.com/v1/me/player/play', {
			method: 'PUT',
			headers: {
				'Authorization': `Bearer ${token.accessToken}`,
				'Content-Type': 'application/json',
			},
			body: {
				context_uri: `spotify:playlist:${appSettings.spotifyRequestPlaylistId}`,
			},
		})
		return { success: true }
	}
	catch (err: any) {
		throw createError({
			statusCode: 500,
			statusMessage: err.data?.error?.message || 'Failed to start Spotify playback. Ensure a Spotify player is open and active on one of your devices.',
		})
	}
})
