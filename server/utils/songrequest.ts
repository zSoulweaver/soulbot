import type { PlaylistTrackInfo } from '~~/server/utils/spotify'
import { and, asc, eq, or, sql } from 'drizzle-orm'
import { cleanUsername } from '~~/server/bot/core/utils'
import { getUserPoints, updateUserPoints } from '~~/server/bot/modules/points/service'
import { checkIsFollowing, parseSpotifyTrackId } from '~~/server/bot/modules/spotify/utils'
import { getStreamInfo } from '~~/server/bot/services/stream'
import { db } from '~~/server/database'
import { spotifyBlacklist, spotifyQueue } from '~~/server/database/schema'
import { getAppSettingsSync } from '~~/server/utils/settings'
import { addTracksToPlaylist, getPlaylistTracks, getTrackDetails, searchTrack } from '~~/server/utils/spotify'
import { getStreamerToken } from '~~/server/utils/twurple'

export class SongRequestError extends Error {
	constructor(
		message: string,
		public statusCode: number = 400,
		public templateId?: string,
		public templateData?: Record<string, string | number>,
	) {
		super(message)
		this.name = 'SongRequestError'
	}
}

export async function requestSong(options: {
	linkOrQuery: string
	user: {
		id: string
		username: string
		displayName: string
		isModOrAbove: boolean
	}
}) {
	const { linkOrQuery, user } = options
	const appSettings = getAppSettingsSync()

	if (!appSettings.spotifySongRequestEnabled) {
		throw new SongRequestError('Song requests are currently disabled.', 400, 'spotify.sr.disabled')
	}

	if (!appSettings.spotifyRequestPlaylistId) {
		throw new SongRequestError('Song request playlist is not initialized.', 400, 'spotify.sr.disabled')
	}

	// Check stream online status unless override is active
	if (!appSettings.spotifySongRequestOfflineOverride) {
		const stream = await getStreamInfo()
		if (!stream.isOnline) {
			throw new SongRequestError('Song requests are only active when the stream is live.', 400, 'spotify.sr.offline')
		}
	}

	// Parse Spotify link or search query
	const trackIdFromLink = parseSpotifyTrackId(linkOrQuery)
	let track: PlaylistTrackInfo | null = null

	if (trackIdFromLink) {
		track = await getTrackDetails(trackIdFromLink)
	}
	else {
		track = await searchTrack(linkOrQuery)
	}

	if (!track) {
		throw new SongRequestError('Track not found on Spotify.', 400, 'spotify.sr.not-found')
	}

	const trackId = trackIdFromLink || track.id

	// Check blacklist
	const isBlacklisted = await db
		.select()
		.from(spotifyBlacklist)
		.where(eq(spotifyBlacklist.trackId, trackId))
		.then(res => res[0])

	if (isBlacklisted) {
		throw new SongRequestError('This track is blacklisted on this channel.', 400, 'spotify.sr.blacklisted')
	}

	// Check duplicate in active queue
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
		throw new SongRequestError('This track is already in the queue.', 400, 'This track is already in the queue.')
	}

	// Check explicit tracks constraint
	if (track.explicit && !appSettings.spotifySongRequestPermitExplicit) {
		throw new SongRequestError('Explicit songs are not permitted on this stream.', 400, 'spotify.sr.explicit-blocked')
	}

	const bypassLimits = appSettings.spotifySongRequestModsBypassLimits && user.isModOrAbove

	// Check maximum length constraint
	const maxLengthMs = appSettings.spotifySongRequestMaxLength * 60 * 1000
	if (appSettings.spotifySongRequestMaxLength > 0 && !bypassLimits && track.durationMs > maxLengthMs) {
		throw new SongRequestError(
			`Song is too long. The maximum allowed length is ${appSettings.spotifySongRequestMaxLength} minutes.`,
			400,
			'spotify.sr.too-long',
			{ max: appSettings.spotifySongRequestMaxLength },
		)
	}

	const streamer = await getStreamerToken()

	// Check followers-only constraint (caster bypasses)
	if (appSettings.spotifySongRequestFollowersOnly && user.id !== streamer?.userId) {
		const isFollowing = await checkIsFollowing(user.id)
		if (!isFollowing) {
			throw new SongRequestError('Song requests are restricted to followers only.', 403, 'spotify.sr.followers-only')
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
			throw new SongRequestError(
				`You have reached your limit of active song requests (${appSettings.spotifySongRequestMaxUserRequests} limit).`,
				400,
				'spotify.sr.user-limit-reached',
				{ max: appSettings.spotifySongRequestMaxUserRequests },
			)
		}
	}

	// Check queue maximum capacity (excluding fallback playlist tracks)
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
		throw new SongRequestError(
			`The song request queue is full (${appSettings.spotifySongRequestMaxQueue} limit).`,
			400,
			'spotify.sr.limit-reached',
			{ max: appSettings.spotifySongRequestMaxQueue },
		)
	}

	// Verify points balance
	const cleanUser = cleanUsername(user.username)
	const userPoints = await getUserPoints(cleanUser)

	if (userPoints === null || userPoints < appSettings.spotifySongRequestPointsCost) {
		throw new SongRequestError(
			`You do not have enough points. Cost: ${appSettings.spotifySongRequestPointsCost} points.`,
			400,
			'spotify.sr.no-points',
			{ cost: appSettings.spotifySongRequestPointsCost },
		)
	}

	// Deduct points
	if (appSettings.spotifySongRequestPointsCost > 0) {
		const updated = await updateUserPoints(cleanUser, -appSettings.spotifySongRequestPointsCost, 'add')
		if (!updated) {
			throw new SongRequestError(
				`You do not have enough points. Cost: ${appSettings.spotifySongRequestPointsCost} points.`,
				400,
				'spotify.sr.no-points',
				{ cost: appSettings.spotifySongRequestPointsCost },
			)
		}
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

	// Get current Spotify playlist size to prevent Index out of bounds
	const playlistTracks = await getPlaylistTracks(appSettings.spotifyRequestPlaylistId)
	const playlistSize = playlistTracks ? playlistTracks.length : 0

	// Calculate and add offset of played tracks at the top of the Spotify playlist
	const playedTracksCount = Math.max(0, playlistSize - activeTracks.length)
	insertPosition += playedTracksCount

	if (insertPosition > playlistSize) {
		insertPosition = playlistSize
	}

	// Insert into DB queue
	let inserted: any = null
	try {
		const [res] = await db
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
		inserted = res
	}
	catch (err) {
		// Refund points if DB insert fails
		if (appSettings.spotifySongRequestPointsCost > 0) {
			await updateUserPoints(cleanUser, appSettings.spotifySongRequestPointsCost, 'add').catch(() => {})
		}
		throw err
	}

	// Add to Spotify custom playlist
	const added = await addTracksToPlaylist(appSettings.spotifyRequestPlaylistId, [track.uri], insertPosition)
	if (!added) {
		// Refund points and delete row if failed
		if (appSettings.spotifySongRequestPointsCost > 0) {
			await updateUserPoints(cleanUser, appSettings.spotifySongRequestPointsCost, 'add').catch(() => {})
		}
		if (inserted) {
			await db.delete(spotifyQueue).where(eq(spotifyQueue.id, inserted.id)).catch(() => {})
		}
		throw new SongRequestError(
			'Failed to add track to Spotify playlist.',
			500,
			'Failed to add track to Spotify playlist. Please check configuration.',
		)
	}

	const position = insertPosition + 1

	return {
		track,
		position,
	}
}
