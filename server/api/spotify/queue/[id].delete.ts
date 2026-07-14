import { eq } from 'drizzle-orm'
import { updateUserPoints } from '~~/server/bot/modules/points/service'
import { getUserRecord } from '~~/server/bot/services/user'
import { db } from '~~/server/database'
import { spotifyQueue } from '~~/server/database/schema'
import { requireUserRole } from '~~/server/utils/auth'
import { sendChannelChatMessage } from '~~/server/utils/chat'
import { getAppSettings } from '~~/server/utils/settings'
import { removeTrackFromPlaylist } from '~~/server/utils/spotify'

export default defineEventHandler(async (event) => {
	const user = await requireUserRole(event)

	const id = Number(event.context.params?.id)
	if (Number.isNaN(id)) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid queue item ID',
		})
	}

	const appSettings = await getAppSettings()

	const [item] = await db
		.select()
		.from(spotifyQueue)
		.where(eq(spotifyQueue.id, id))

	if (!item || item.status === 'removed' || item.status === 'played') {
		throw createError({
			statusCode: 404,
			statusMessage: 'Queue item not found or already completed.',
		})
	}

	const isPrivledged = user.role === 'caster' || user.role === 'admin' || user.role === 'moderator'
	const isOwner = item.requestedBy.toLowerCase() === user.displayName.toLowerCase()
	if (!isPrivledged) {
		if (!isOwner) {
			throw createError({
				statusCode: 403,
				statusMessage: 'You do not have permission to remove this item.',
			})
		}
		if (item.status !== 'pending') {
			throw createError({
				statusCode: 400,
				statusMessage: 'You can only remove pending requests.',
			})
		}
	}

	const query = getQuery(event) || {}
	const isSilent = query.silent === 'true'

	if (isSilent && !isPrivledged) {
		throw createError({
			statusCode: 403,
			statusMessage: 'You do not have permission to remove this item silently.',
		})
	}

	// Update DB status to removed
	await db.update(spotifyQueue)
		.set({ status: 'removed' })
		.where(eq(spotifyQueue.id, id))

	// Refund user points
	if (item.pointsCost > 0) {
		const requesterUser = await getUserRecord(item.requestedBy)
		if (requesterUser) {
			await updateUserPoints(requesterUser.username, item.pointsCost, 'add')
		}
	}

	// Remove from custom Spotify playlist
	if (appSettings.spotifyRequestPlaylistId) {
		const trackUri = item.trackId.startsWith('spotify:track:') ? item.trackId : `spotify:track:${item.trackId}`
		await removeTrackFromPlaylist(appSettings.spotifyRequestPlaylistId, trackUri)
	}

	// Notify Twitch chat
	if (item.requestedBy !== 'Fallback Playlist' && appSettings.spotifyPlaylistAnnounceDeleteWebui && !isSilent) {
		await sendChannelChatMessage('spotify.sr.removed', {
			track: item.title,
			user: item.requestedBy,
		})
	}

	return { success: true }
})
