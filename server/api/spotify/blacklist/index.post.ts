import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { updateUserPoints } from '~~/server/bot/modules/points/service'
import { getUserRecord } from '~~/server/bot/services/user'
import { db } from '~~/server/database'
import { spotifyBlacklist, spotifyQueue } from '~~/server/database/schema'
import { requireUserRole } from '~~/server/utils/auth'
import { getAppSettings } from '~~/server/utils/settings'
import { getTrackDetails, removeTracksFromPlaylist } from '~~/server/utils/spotify'

const blacklistSchema = z.object({
	link: z.string().min(1, 'Spotify track link or URI is required'),
})

function parseSpotifyTrackId(input: string): string | null {
	const trimmed = input.trim()
	const uriMatch = trimmed.match(/^spotify:track:([a-zA-Z0-9]{22})$/)
	if (uriMatch)
		return uriMatch[1] || null

	const urlMatch = trimmed.match(/open\.spotify\.com\/track\/([a-zA-Z0-9]{22})/)
	if (urlMatch)
		return urlMatch[1] || null

	return null
}

export default defineEventHandler(async (event) => {
	const user = await requireUserRole(event, 'moderator')
	const body = await readBody(event)
	const parsed = blacklistSchema.safeParse(body)

	if (!parsed.success) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid input. Spotify link is required.',
		})
	}

	const trackId = parseSpotifyTrackId(parsed.data.link)
	if (!trackId) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid Spotify link. Direct track links or Spotify URIs only.',
		})
	}

	// Check if already blacklisted
	const existing = await db
		.select()
		.from(spotifyBlacklist)
		.where(eq(spotifyBlacklist.trackId, trackId))
		.then(res => res[0])

	if (existing) {
		throw createError({
			statusCode: 400,
			statusMessage: 'This track is already blacklisted.',
		})
	}

	// Fetch track details from Spotify API
	const track = await getTrackDetails(trackId)
	if (!track) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Track not found on Spotify.',
		})
	}

	// Insert into DB blacklist
	const [newBlacklistItem] = await db
		.insert(spotifyBlacklist)
		.values({
			trackId: track.id,
			title: track.title,
			artist: track.artist,
			albumArt: track.albumArt,
			addedBy: user.displayName,
			createdAt: new Date(),
		})
		.returning()

	// Find any matching pending requests in the active queue to remove and refund
	const pendingRequests = await db
		.select()
		.from(spotifyQueue)
		.where(
			and(
				eq(spotifyQueue.trackId, track.id),
				eq(spotifyQueue.status, 'pending'),
			),
		)

	const appSettings = await getAppSettings()

	for (const item of pendingRequests) {
		// Mark as removed
		await db.update(spotifyQueue)
			.set({ status: 'removed' })
			.where(eq(spotifyQueue.id, item.id))

		// Refund points
		if (item.pointsCost > 0) {
			const requesterUser = await getUserRecord(item.requestedBy)
			if (requesterUser) {
				await updateUserPoints(requesterUser.username, item.pointsCost, 'add')
			}
		}

		// Remove from Spotify request playlist
		if (appSettings.spotifyRequestPlaylistId) {
			const trackUri = item.trackId.startsWith('spotify:track:') ? item.trackId : `spotify:track:${item.trackId}`
			await removeTracksFromPlaylist(appSettings.spotifyRequestPlaylistId, [trackUri])
		}
	}

	return { success: true, track: newBlacklistItem }
})
