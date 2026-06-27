import type { CommandHandler } from '~~/server/bot/core/types'
import type { PlaylistTrackInfo } from '~~/server/utils/spotify'
import type { SongRequestArgs } from '../schema'
import { and, asc, eq, or, sql } from 'drizzle-orm'
import { cleanUsername } from '~~/server/bot/core/utils'
import { getStreamInfo } from '~~/server/bot/services/stream'
import { db } from '~~/server/database'
import { spotifyBlacklist, spotifyQueue } from '~~/server/database/schema'
import { getAppSettingsSync } from '~~/server/utils/settings'
import { addTracksToPlaylist, getCurrentlyPlaying, getTrackDetails, resumePlaylistWithOffset, searchTrack } from '~~/server/utils/spotify'
import { getStreamerToken } from '~~/server/utils/twurple'
import { getUserPoints, updateUserPoints } from '../../points/service'
import { checkIsFollowing, parseSpotifyTrackId } from '../utils'

export const handleSongRequestRoot: CommandHandler<typeof SongRequestArgs> = async (ctx, [spotifyLink]) => {
	const appSettings = getAppSettingsSync()

	if (!appSettings.spotifySongRequestEnabled || !appSettings.spotifyRequestPlaylistId) {
		return ctx.reply('spotify.sr.disabled')
	}

	// Check stream online status unless override is active
	if (!appSettings.spotifySongRequestOfflineOverride) {
		const stream = await getStreamInfo()
		if (!stream.isOnline) {
			return ctx.reply('spotify.sr.offline')
		}
	}

	// Parse Spotify link or search query
	const trackIdFromLink = parseSpotifyTrackId(spotifyLink)
	let track: PlaylistTrackInfo | null = null

	if (trackIdFromLink) {
		track = await getTrackDetails(trackIdFromLink)
	}
	else {
		track = await searchTrack(spotifyLink)
	}

	if (!track) {
		return ctx.reply('spotify.sr.not-found')
	}

	const trackId = trackIdFromLink || track.id

	// Check blacklist
	const isBlacklisted = await db
		.select()
		.from(spotifyBlacklist)
		.where(eq(spotifyBlacklist.trackId, trackId))
		.then(res => res[0])

	if (isBlacklisted) {
		return ctx.reply('spotify.sr.blacklisted')
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
		return ctx.reply('This track is already in the queue.')
	}

	// Check explicit tracks constraint
	if (track.explicit && !appSettings.spotifySongRequestPermitExplicit) {
		return ctx.reply('spotify.sr.explicit-blocked')
	}

	const isModOrAbove = ctx.raw.userInfo.isBroadcaster || ctx.raw.userInfo.isMod
	const bypassLimits = appSettings.spotifySongRequestModsBypassLimits && isModOrAbove

	// Check maximum length constraint
	const maxLengthMs = appSettings.spotifySongRequestMaxLength * 60 * 1000
	if (appSettings.spotifySongRequestMaxLength > 0 && !bypassLimits && track.durationMs > maxLengthMs) {
		return ctx.reply('spotify.sr.too-long', { max: appSettings.spotifySongRequestMaxLength })
	}

	const streamer = await getStreamerToken()

	// Check followers-only constraint (caster bypasses)
	if (appSettings.spotifySongRequestFollowersOnly && ctx.raw.userInfo.userId !== streamer?.userId) {
		const isFollowing = await checkIsFollowing(ctx.raw.userInfo.userId)
		if (!isFollowing) {
			return ctx.reply('spotify.sr.followers-only')
		}
	}

	// Check maximum number of songs a single user can request
	if (appSettings.spotifySongRequestMaxUserRequests > 0 && !bypassLimits) {
		const userRequestsCountRes = await db
			.select({ count: sql<number>`count(*)` })
			.from(spotifyQueue)
			.where(
				and(
					eq(spotifyQueue.requestedBy, ctx.user.displayName),
					or(
						eq(spotifyQueue.status, 'pending'),
						eq(spotifyQueue.status, 'playing'),
					),
				),
			)
		const userRequestsCount = userRequestsCountRes[0]?.count ?? 0
		if (userRequestsCount >= appSettings.spotifySongRequestMaxUserRequests) {
			return ctx.reply('spotify.sr.user-limit-reached', { max: appSettings.spotifySongRequestMaxUserRequests })
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
		return ctx.reply('spotify.sr.limit-reached', { max: appSettings.spotifySongRequestMaxQueue })
	}

	// Check user points balance
	const cleanUser = cleanUsername(ctx.user.name)
	const userPoints = await getUserPoints(cleanUser)

	if (userPoints === null || userPoints < appSettings.spotifySongRequestPointsCost) {
		return ctx.reply('spotify.sr.no-points', { cost: appSettings.spotifySongRequestPointsCost })
	}

	// Deduct points
	if (appSettings.spotifySongRequestPointsCost > 0) {
		await updateUserPoints(cleanUser, -appSettings.spotifySongRequestPointsCost, 'add')
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

	// Insert into DB queue
	const [inserted] = await db
		.insert(spotifyQueue)
		.values({
			trackId: track.id,
			title: track.title,
			artist: track.artist,
			durationMs: track.durationMs,
			albumArt: track.albumArt,
			requestedBy: ctx.user.displayName,
			pointsCost: appSettings.spotifySongRequestPointsCost,
			status: 'pending',
		})
		.returning()

	// Add to Spotify custom playlist
	const added = await addTracksToPlaylist(appSettings.spotifyRequestPlaylistId, [track.uri], insertPosition)
	if (!added) {
		// Refund points and delete row if failed
		if (appSettings.spotifySongRequestPointsCost > 0) {
			await updateUserPoints(cleanUser, appSettings.spotifySongRequestPointsCost, 'add')
		}
		if (inserted) {
			await db.delete(spotifyQueue).where(eq(spotifyQueue.id, inserted.id))
		}
		return ctx.reply('Failed to add track to Spotify playlist. Please check configuration.')
	}

	// Context recovery check
	const currentTrack = await getCurrentlyPlaying(true)
	const expectedPlaylistUri = `spotify:playlist:${appSettings.spotifyRequestPlaylistId}`
	if (currentTrack && currentTrack.isPlaying && currentTrack.contextUri !== expectedPlaylistUri) {
		await resumePlaylistWithOffset(track.uri)
	}

	const position = insertPosition + 1

	return ctx.reply('spotify.sr.requested', {
		track: track.title,
		artist: track.artist,
		position,
	})
}
