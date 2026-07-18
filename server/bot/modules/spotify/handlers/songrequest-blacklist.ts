import type { CommandHandler } from '~~/server/bot/core/types'
import type { SongRequestBlacklistArgs } from '../schema'
import { and, eq } from 'drizzle-orm'
import { getUserRecord } from '~~/server/bot/services/user'
import { db } from '~~/server/database'
import { spotifyBlacklist, spotifyQueue } from '~~/server/database/schema'
import { getAppSettingsSync } from '~~/server/utils/settings'
import { getTrackDetails, removeTracksFromPlaylist } from '~~/server/utils/spotify'
import { updateUserPoints } from '../../points/service'
import { parseSpotifyTrackId } from '../utils'

export const handleSongRequestBlacklist: CommandHandler<typeof SongRequestBlacklistArgs> = async (ctx, [spotifyLink]) => {
	const trackId = parseSpotifyTrackId(spotifyLink)
	if (!trackId) {
		return ctx.reply('spotify.sr.not-found')
	}

	// Check if already blacklisted
	const existing = await db
		.select()
		.from(spotifyBlacklist)
		.where(eq(spotifyBlacklist.trackId, trackId))
		.then(res => res[0])

	if (existing) {
		return ctx.reply('This track is already blacklisted.')
	}

	// Fetch track details
	const track = await getTrackDetails(trackId)
	if (!track) {
		return ctx.reply('spotify.sr.not-found')
	}

	// Add to database
	await db.insert(spotifyBlacklist).values({
		trackId: track.id,
		title: track.title,
		artist: track.artist,
		albumArt: track.albumArt,
		addedBy: ctx.user.displayName,
		createdAt: new Date(),
	})

	// Remove all matching pending requests
	const pendingRequests = await db
		.select()
		.from(spotifyQueue)
		.where(
			and(
				eq(spotifyQueue.trackId, track.id),
				eq(spotifyQueue.status, 'pending'),
			),
		)

	const appSettings = getAppSettingsSync()

	for (const item of pendingRequests) {
		await db.update(spotifyQueue)
			.set({ status: 'removed' })
			.where(eq(spotifyQueue.id, item.id))

		if (item.pointsCost > 0) {
			const requesterUser = await getUserRecord(item.requestedBy)
			if (requesterUser) {
				await updateUserPoints(requesterUser.username, item.pointsCost, 'add')
			}
		}

		if (appSettings.spotifyRequestPlaylistId) {
			const trackUri = item.trackId.startsWith('spotify:track:') ? item.trackId : `spotify:track:${item.trackId}`
			await removeTracksFromPlaylist(appSettings.spotifyRequestPlaylistId, [trackUri])
		}
	}

	return ctx.reply(`Track "${track.title}" has been added to the blacklist.`)
}
