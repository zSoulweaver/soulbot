import { and, asc, eq, or, sql } from 'drizzle-orm'
import { z } from 'zod'
import { getUserPoints, updateUserPoints } from '~~/server/bot/modules/points/service'
import { getStreamInfo } from '~~/server/bot/services/stream'
import { db } from '~~/server/database'
import { spotifyBlacklist, spotifyQueue } from '~~/server/database/schema'
import { requireUserRole } from '~~/server/utils/auth'
import { getAppSettings } from '~~/server/utils/settings'
import { addTracksToPlaylist, getCurrentlyPlaying, getTrackDetails, resumePlaylistWithOffset } from '~~/server/utils/spotify'
import { getApiClient, getStreamerToken } from '~~/server/utils/twurple'

const submitRequestSchema = z.object({
	link: z.string().min(1, 'Spotify link is required'),
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

async function checkIsFollowing(twitchUserId: string): Promise<boolean> {
	try {
		const streamerToken = await getStreamerToken()
		if (!streamerToken || !streamerToken.userId)
			return false
		const api = getApiClient()
		const followResult = await api.channels.getChannelFollowers(streamerToken.userId, twitchUserId)
		return followResult.data.length > 0
	}
	catch {
		return false
	}
}

export default defineEventHandler(async (event) => {
	const user = await requireUserRole(event)
	const body = await readBody(event)
	const parsed = submitRequestSchema.safeParse(body)

	if (!parsed.success) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Spotify link is required',
		})
	}

	const appSettings = await getAppSettings()

	if (!appSettings.spotifySongRequestEnabled) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Song requests are currently disabled.',
		})
	}

	if (!appSettings.spotifyRequestPlaylistId) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Song request playlist is not initialized.',
		})
	}

	if (!appSettings.spotifySongRequestOfflineOverride) {
		const stream = await getStreamInfo()
		if (!stream.isOnline) {
			throw createError({
				statusCode: 400,
				statusMessage: 'Song requests are only active when the stream is live.',
			})
		}
	}

	const trackId = parseSpotifyTrackId(parsed.data.link)
	if (!trackId) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid Spotify link. Direct track links or Spotify URIs only.',
		})
	}

	// Check blacklist
	const isBlacklisted = await db
		.select()
		.from(spotifyBlacklist)
		.where(eq(spotifyBlacklist.trackId, trackId))
		.then(res => res[0])

	if (isBlacklisted) {
		throw createError({
			statusCode: 400,
			statusMessage: 'This track is blacklisted on this channel.',
		})
	}

	// Check duplicates
	const existing = await db
		.select()
		.from(spotifyQueue)
		.where(
			and(
				eq(spotifyQueue.trackId, trackId),
				or(
					eq(spotifyQueue.status, 'pending'),
					eq(spotifyQueue.status, 'playing'),
				),
			),
		)

	if (existing.length > 0) {
		throw createError({
			statusCode: 400,
			statusMessage: 'This track is already in the queue.',
		})
	}

	const track = await getTrackDetails(trackId)
	if (!track) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Track not found on Spotify.',
		})
	}

	if (track.explicit && !appSettings.spotifySongRequestPermitExplicit) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Explicit songs are not permitted on this stream.',
		})
	}

	const isModOrAbove = user.role === 'caster' || user.role === 'moderator'
	const bypassLimits = appSettings.spotifySongRequestModsBypassLimits && isModOrAbove

	// Check max song length
	const maxLengthMs = appSettings.spotifySongRequestMaxLength * 60 * 1000
	if (appSettings.spotifySongRequestMaxLength > 0 && !bypassLimits && track.durationMs > maxLengthMs) {
		throw createError({
			statusCode: 400,
			statusMessage: `Song is too long. The maximum allowed length is ${appSettings.spotifySongRequestMaxLength} minutes.`,
		})
	}

	const streamer = await getStreamerToken()

	// Check follower status
	if (appSettings.spotifySongRequestFollowersOnly && user.id !== streamer?.userId) {
		const isFollowing = await checkIsFollowing(user.id)
		if (!isFollowing) {
			throw createError({
				statusCode: 403,
				statusMessage: 'Song requests are restricted to followers only.',
			})
		}
	}

	// Check maximum number of songs a single user can request
	if (appSettings.spotifySongRequestMaxUserRequests > 0 && !bypassLimits) {
		const userRequestsCountRes = await db
			.select({ count: sql<number>`count(*)` })
			.from(spotifyQueue)
			.where(
				and(
					eq(spotifyQueue.requestedBy, user.displayName),
					or(
						eq(spotifyQueue.status, 'pending'),
						eq(spotifyQueue.status, 'playing'),
					),
				),
			)
		const userRequestsCount = userRequestsCountRes[0]?.count ?? 0
		if (userRequestsCount >= appSettings.spotifySongRequestMaxUserRequests) {
			throw createError({
				statusCode: 400,
				statusMessage: `You have reached your limit of active song requests (${appSettings.spotifySongRequestMaxUserRequests} limit).`,
			})
		}
	}

	// Capacity check (excluding fallback playlist tracks)
	const activeCountRes = await db
		.select({ count: sql<number>`count(*)` })
		.from(spotifyQueue)
		.where(
			and(
				or(
					eq(spotifyQueue.status, 'pending'),
					eq(spotifyQueue.status, 'playing'),
				),
				sql`${spotifyQueue.requestedBy} != 'Fallback Playlist'`,
			),
		)
	const activeCount = activeCountRes[0]?.count ?? 0

	if (appSettings.spotifySongRequestMaxQueue > 0 && activeCount >= appSettings.spotifySongRequestMaxQueue) {
		throw createError({
			statusCode: 400,
			statusMessage: `The song request queue is full (${appSettings.spotifySongRequestMaxQueue} limit).`,
		})
	}

	// Verify points balance
	const points = await getUserPoints(user.username)
	if (points === null || points < appSettings.spotifySongRequestPointsCost) {
		throw createError({
			statusCode: 400,
			statusMessage: `You do not have enough points. Cost: ${appSettings.spotifySongRequestPointsCost} points.`,
		})
	}

	// Deduct points
	if (appSettings.spotifySongRequestPointsCost > 0) {
		await updateUserPoints(user.username, -appSettings.spotifySongRequestPointsCost, 'add')
	}

	// Fetch active tracks ordered identically to the queue engine
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

	let insertPosition = activeTracks.length
	const firstPendingFallbackIndex = activeTracks.findIndex(
		t => t.status === 'pending' && t.requestedBy === 'Fallback Playlist',
	)
	if (firstPendingFallbackIndex !== -1) {
		insertPosition = firstPendingFallbackIndex
	}

	// Insert into DB
	const [inserted] = await db
		.insert(spotifyQueue)
		.values({
			trackId: track.id,
			title: track.title,
			artist: track.artist,
			durationMs: track.durationMs,
			albumArt: track.albumArt,
			requestedBy: user.displayName,
			pointsCost: appSettings.spotifySongRequestPointsCost,
			status: 'pending',
		})
		.returning()

	// Add to Spotify playlist
	const added = await addTracksToPlaylist(appSettings.spotifyRequestPlaylistId, [track.uri], insertPosition)
	if (!added) {
		if (appSettings.spotifySongRequestPointsCost > 0) {
			await updateUserPoints(user.username, appSettings.spotifySongRequestPointsCost, 'add')
		}
		if (inserted) {
			await db.delete(spotifyQueue).where(eq(spotifyQueue.id, inserted.id))
		}
		throw createError({
			statusCode: 500,
			statusMessage: 'Failed to add track to Spotify playlist.',
		})
	}

	// Context recovery check
	const currentTrack = await getCurrentlyPlaying(true)
	const expectedPlaylistUri = `spotify:playlist:${appSettings.spotifyRequestPlaylistId}`
	if (currentTrack && currentTrack.isPlaying && currentTrack.contextUri !== expectedPlaylistUri) {
		await resumePlaylistWithOffset(track.uri)
	}

	return { success: true, track }
})
