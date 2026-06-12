import type { CommandHandler } from '~~/server/bot/core/types'
import { getAppSettingsSync } from '~~/server/utils/settings'
import { addLikedTrackToCache, addTrackToPlaylist, getCurrentlyPlaying, isTrackLiked } from '~~/server/utils/spotify'

export const handleSongRequestLike: CommandHandler = async (ctx) => {
	const appSettings = getAppSettingsSync()

	if (!appSettings.spotifyPlaylistTargetId) {
		return ctx.reply('spotify.playlist.no-target')
	}

	const currentlyPlaying = await getCurrentlyPlaying(true)
	if (!currentlyPlaying || !currentlyPlaying.isPlaying) {
		return ctx.reply('spotify.song.not-playing')
	}

	// Check if already liked
	const liked = await isTrackLiked(appSettings.spotifyPlaylistTargetId, currentlyPlaying.id)
	if (liked) {
		return ctx.reply('spotify.playlist.already-liked')
	}

	const added = await addTrackToPlaylist(appSettings.spotifyPlaylistTargetId, currentlyPlaying.uri)
	if (added) {
		// Add directly to cache
		await addLikedTrackToCache(appSettings.spotifyPlaylistTargetId, {
			id: currentlyPlaying.id,
			uri: currentlyPlaying.uri,
			title: currentlyPlaying.title,
			artist: currentlyPlaying.artist,
			durationMs: currentlyPlaying.durationMs || 0,
			albumArt: currentlyPlaying.albumArt || null,
		})
		return ctx.reply('spotify.playlist.liked')
	}
	else {
		return ctx.reply('Failed to save track to playlist.')
	}
}
