import { desc, eq, sql } from 'drizzle-orm'
import { db } from '~~/server/database'
import { spotifyQueue } from '~~/server/database/schema'
import { buildPaginationMeta, parsePaginationParams } from '~~/server/utils/pagination'

export default defineEventHandler(async (event) => {
	const { page, limit } = parsePaginationParams(event)
	const offset = (page - 1) * limit

	const totalCountResult = await db
		.select({ count: sql<number>`count(*)` })
		.from(spotifyQueue)
		.where(eq(spotifyQueue.status, 'played'))

	const total = totalCountResult[0]?.count || 0

	const history = await db
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
		.where(eq(spotifyQueue.status, 'played'))
		.orderBy(desc(spotifyQueue.playedAt), desc(spotifyQueue.id))
		.limit(limit)
		.offset(offset)

	return {
		data: history,
		meta: buildPaginationMeta(total, page, limit),
	}
})
