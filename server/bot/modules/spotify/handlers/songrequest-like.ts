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

		const { db } = await import('~~/server/database')
		const { spotifyQueue } = await import('~~/server/database/schema')
		const { and, asc, eq, or } = await import('drizzle-orm')

		const activeTrack = await db
			.select()
			.from(spotifyQueue)
			.where(
				and(
					eq(spotifyQueue.trackId, currentlyPlaying.id),
					or(
						eq(spotifyQueue.status, 'playing'),
						eq(spotifyQueue.status, 'pending'),
					),
				),
			)
			.orderBy(asc(spotifyQueue.id))
			.then(res => res[0])

		const requester = (activeTrack && activeTrack.requestedBy !== 'Fallback Playlist')
			? activeTrack.requestedBy
			: null

		const { notifySongSaved } = await import('~~/server/utils/chat')
		await notifySongSaved(currentlyPlaying.id, currentlyPlaying.title, currentlyPlaying.artist, true)

		if (appSettings.spotifyPlaylistWhisper) {
			return ctx.reply('Saved track to playlist.')
		}
		else {
			const { getStreamerChannelName } = await import('~~/server/utils/twurple')
			const caster = (await getStreamerChannelName()) || 'streamer'
			return ctx.say('spotify.playlist.liked', {
				caster,
				requester: requester || caster,
			})
		}
	}
	else {
		return ctx.reply('Failed to save track to playlist.')
	}
}
