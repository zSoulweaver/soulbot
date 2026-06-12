import type { CommandHandler } from '~~/server/bot/core/types'
import { and, desc, eq } from 'drizzle-orm'
import { cleanUsername } from '~~/server/bot/core/utils'
import { db } from '~~/server/database'
import { spotifyQueue } from '~~/server/database/schema'
import { getAppSettingsSync } from '~~/server/utils/settings'
import { removeTrackFromPlaylist } from '~~/server/utils/spotify'
import { updateUserPoints } from '../../points/service'

export const handleSongRequestWrongSong: CommandHandler = async (ctx) => {
	const appSettings = getAppSettingsSync()

	// Find the user's latest pending request
	const [userRequest] = await db
		.select()
		.from(spotifyQueue)
		.where(
			and(
				eq(spotifyQueue.requestedBy, ctx.user.displayName),
				eq(spotifyQueue.status, 'pending'),
			),
		)
		.orderBy(desc(spotifyQueue.id))
		.limit(1)

	if (!userRequest) {
		return ctx.reply('spotify.sr.no-request')
	}

	// Mark as removed in DB
	await db.update(spotifyQueue)
		.set({ status: 'removed' })
		.where(eq(spotifyQueue.id, userRequest.id))

	// Refund points
	const cleanUser = cleanUsername(ctx.user.name)
	if (userRequest.pointsCost > 0) {
		await updateUserPoints(cleanUser, userRequest.pointsCost, 'add')
	}

	// Remove from Spotify playlist
	if (appSettings.spotifyRequestPlaylistId) {
		const trackUri = userRequest.trackId.startsWith('spotify:track:') ? userRequest.trackId : `spotify:track:${userRequest.trackId}`
		await removeTrackFromPlaylist(appSettings.spotifyRequestPlaylistId, trackUri)
	}

	return ctx.reply('spotify.sr.wrongsong', {
		track: userRequest.title,
		points: userRequest.pointsCost,
	})
}
