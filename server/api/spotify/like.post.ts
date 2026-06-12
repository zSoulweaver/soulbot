import { requireUserRole } from '~~/server/utils/auth'
import { getAppSettings } from '~~/server/utils/settings'
import { addLikedTrackToCache, addTrackToPlaylist, getCurrentlyPlaying, isTrackLiked } from '~~/server/utils/spotify'

export default defineEventHandler(async (event) => {
	const appSettings = await getAppSettings()

	// Authenticate user session
	const user = await requireUserRole(event)
	const isAllowed = user.role === 'caster' || (user.role === 'moderator' && appSettings.spotifyPlaylistAllowMods)

	if (!isAllowed) {
		throw createError({
			statusCode: 403,
			statusMessage: 'Forbidden: You do not have permission to like songs.',
		})
	}

	if (!appSettings.spotifyPlaylistTargetId) {
		throw createError({
			statusCode: 400,
			statusMessage: 'No target playlist configured in Spotify settings.',
		})
	}

	const currentlyPlaying = await getCurrentlyPlaying(true)
	if (!currentlyPlaying || !currentlyPlaying.link) {
		throw createError({
			statusCode: 400,
			statusMessage: 'No song is currently playing on Spotify.',
		})
	}

	// Check if already liked
	const liked = await isTrackLiked(appSettings.spotifyPlaylistTargetId, currentlyPlaying.id)
	if (liked) {
		return { success: true, alreadyLiked: true, title: currentlyPlaying.title }
	}

	// Add track to Spotify playlist
	const added = await addTrackToPlaylist(appSettings.spotifyPlaylistTargetId, currentlyPlaying.uri)
	if (!added) {
		throw createError({
			statusCode: 500,
			statusMessage: 'Failed to save song to Spotify playlist.',
		})
	}

	// Add to database cache and in-memory cache directly
	await addLikedTrackToCache(appSettings.spotifyPlaylistTargetId, {
		id: currentlyPlaying.id,
		uri: currentlyPlaying.uri,
		title: currentlyPlaying.title,
		artist: currentlyPlaying.artist,
		durationMs: currentlyPlaying.durationMs || 0,
		albumArt: currentlyPlaying.albumArt || null,
	})

	return { success: true, alreadyLiked: false, title: currentlyPlaying.title }
})
