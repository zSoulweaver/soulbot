import type { CommandHandler } from '~~/server/bot/core/types'
import type { SongRequestRemoveArgs } from '../schema'
import { asc, eq, or, sql } from 'drizzle-orm'
import { getUserRecord } from '~~/server/bot/services/user'
import { db } from '~~/server/database'
import { spotifyQueue } from '~~/server/database/schema'
import { getAppSettingsSync } from '~~/server/utils/settings'
import { removeTrackFromPlaylist } from '~~/server/utils/spotify'
import { updateUserPoints } from '../../points/service'

export const handleSongRequestRemove: CommandHandler<typeof SongRequestRemoveArgs> = async (ctx, [position]) => {
	const appSettings = getAppSettingsSync()

	const activeTracks = await db
		.select()
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

	const index = position - 1
	if (index < 0 || index >= activeTracks.length) {
		return ctx.reply('Queue item not found at that position.')
	}

	const item = activeTracks[index]
	if (!item) {
		return ctx.reply('Queue item not found at that position.')
	}

	// Mark as removed
	await db.update(spotifyQueue)
		.set({ status: 'removed' })
		.where(eq(spotifyQueue.id, item.id))

	// Refund points to request user
	if (item.pointsCost > 0) {
		const requesterUser = await getUserRecord(item.requestedBy)
		if (requesterUser) {
			await updateUserPoints(requesterUser.username, item.pointsCost, 'add')
		}
	}

	// Remove from Spotify playlist
	if (appSettings.spotifyRequestPlaylistId) {
		const trackUri = item.trackId.startsWith('spotify:track:') ? item.trackId : `spotify:track:${item.trackId}`
		await removeTrackFromPlaylist(appSettings.spotifyRequestPlaylistId, trackUri)
	}

	return ctx.reply('spotify.sr.removed', {
		track: item.title,
		user: item.requestedBy,
	})
}
