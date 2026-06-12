import { and, eq, ne, or } from 'drizzle-orm'
import { updateUserPoints } from '~~/server/bot/modules/points/service'
import { getUserRecord } from '~~/server/bot/services/user'
import { db } from '~~/server/database'
import { spotifyQueue } from '~~/server/database/schema'
import { requireUserRole } from '~~/server/utils/auth'
import { sendChannelChatMessage } from '~~/server/utils/chat'
import { getAppSettings } from '~~/server/utils/settings'
import { removeTrackFromPlaylist } from '~~/server/utils/spotify'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'caster')
	const appSettings = await getAppSettings()

	// Retrieve active viewer tracks (excluding autoplay fallback tracks)
	const viewerTracks = await db
		.select()
		.from(spotifyQueue)
		.where(
			and(
				or(
					eq(spotifyQueue.status, 'pending'),
					eq(spotifyQueue.status, 'playing'),
				),
				ne(spotifyQueue.requestedBy, 'Fallback Playlist'),
			),
		)

	// Refund points to users
	for (const item of viewerTracks) {
		if (item.pointsCost > 0) {
			const requesterUser = await getUserRecord(item.requestedBy)
			if (requesterUser) {
				await updateUserPoints(requesterUser.username, item.pointsCost, 'add')
			}
		}
	}

	// Mark viewer tracks as removed in database
	if (viewerTracks.length > 0) {
		await db.update(spotifyQueue)
			.set({ status: 'removed' })
			.where(
				and(
					or(
						eq(spotifyQueue.status, 'pending'),
						eq(spotifyQueue.status, 'playing'),
					),
					ne(spotifyQueue.requestedBy, 'Fallback Playlist'),
				),
			)

		// Remove from custom Spotify playlist
		if (appSettings.spotifyRequestPlaylistId) {
			for (const item of viewerTracks) {
				const trackUri = item.trackId.startsWith('spotify:track:') ? item.trackId : `spotify:track:${item.trackId}`
				await removeTrackFromPlaylist(appSettings.spotifyRequestPlaylistId, trackUri)
			}
		}
	}

	// Broadcast notification to Twitch chat
	await sendChannelChatMessage('spotify.sr.cleared')

	return { success: true }
})
