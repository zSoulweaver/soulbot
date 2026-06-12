import { db } from '~~/server/database'
import { settings } from '~~/server/database/schema'
import { requireUserRole } from '~~/server/utils/auth'
import { refreshAppSettingsCache } from '~~/server/utils/settings'
import { createQueuePlaylist, getSpotifyUserId } from '~~/server/utils/spotify'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'caster')

	const spotifyUserId = await getSpotifyUserId()
	if (!spotifyUserId) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Failed to retrieve Spotify user ID. Please check connection.',
		})
	}

	const playlistId = await createQueuePlaylist(spotifyUserId, 'Soulbot Song Requests')
	if (!playlistId) {
		throw createError({
			statusCode: 500,
			statusMessage: 'Failed to create dedicated queue playlist on Spotify.',
		})
	}

	// Update settings
	await db.insert(settings)
		.values({
			key: 'spotify.request.playlist_id',
			value: playlistId,
			updatedAt: new Date(),
		})
		.onConflictDoUpdate({
			target: settings.key,
			set: {
				value: playlistId,
				updatedAt: new Date(),
			},
		})

	await refreshAppSettingsCache()

	return { success: true, playlistId }
})
