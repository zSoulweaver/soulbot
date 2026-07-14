import { asc, eq, or, sql } from 'drizzle-orm'
import { db } from '~~/server/database'
import { spotifyQueue } from '~~/server/database/schema'
import { getAppSettings } from '~~/server/utils/settings'
import { getCurrentlyPlaying, getSpotifyToken, isTrackLiked } from '~~/server/utils/spotify'

export default defineEventHandler(async (_event) => {
	const appSettings = await getAppSettings()
	const token = await getSpotifyToken()
	const connected = !!token

	let currentlyPlaying = null
	if (connected) {
		const track = await getCurrentlyPlaying()
		if (track) {
			const isLiked = appSettings.spotifyPlaylistTargetId
				? await isTrackLiked(appSettings.spotifyPlaylistTargetId, track.id)
				: false
			currentlyPlaying = { ...track, isLiked }
		}
	}

	const queue = await db
		.select({
			id: spotifyQueue.id,
			trackId: spotifyQueue.trackId,
			title: spotifyQueue.title,
			artist: spotifyQueue.artist,
			durationMs: spotifyQueue.durationMs,
			albumArt: spotifyQueue.albumArt,
			requestedBy: spotifyQueue.requestedBy,
			playedAt: spotifyQueue.playedAt,
			createdAt: spotifyQueue.createdAt,
			status: spotifyQueue.status,
		})
		.from(spotifyQueue)
		.where(
			or(
				eq(spotifyQueue.status, 'playing'),
				eq(spotifyQueue.status, 'pending'),
			),
		)
		.orderBy(
			sql`CASE WHEN ${spotifyQueue.status} = 'playing' THEN 0 ELSE 1 END`,
			sql`CASE WHEN ${spotifyQueue.requestedBy} = 'Fallback Playlist' THEN 1 ELSE 0 END`,
			asc(spotifyQueue.id),
		)

	return {
		connected,
		currentlyPlaying,
		queue,
		settings: {
			active: appSettings.spotifySongRequestEnabled,
			pointsCost: appSettings.spotifySongRequestPointsCost,
			maxLength: appSettings.spotifySongRequestMaxLength,
			maxQueue: appSettings.spotifySongRequestMaxQueue,
			maxUserRequests: appSettings.spotifySongRequestMaxUserRequests,
			followersOnly: appSettings.spotifySongRequestFollowersOnly,
			permitExplicit: appSettings.spotifySongRequestPermitExplicit,
			offlineOverride: appSettings.spotifySongRequestOfflineOverride,
			playlistId: appSettings.spotifyRequestPlaylistId,
			announceDeleteWebui: appSettings.spotifyPlaylistAnnounceDeleteWebui,
		},
	}
})
