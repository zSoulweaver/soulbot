import { desc, eq, like, or, sql } from 'drizzle-orm'
import { db } from '~~/server/database'
import { spotifyBlacklist, users } from '~~/server/database/schema'
import { requireUserRole } from '~~/server/utils/auth'
import { buildPaginationMeta, parsePaginationParams } from '~~/server/utils/pagination'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')
	const { page, limit, search } = parsePaginationParams(event)

	let conditions
	if (search) {
		conditions = or(
			like(spotifyBlacklist.title, `%${search}%`),
			like(spotifyBlacklist.artist, `%${search}%`),
		)
	}

	const countRes = await db
		.select({ count: sql<number>`count(*)` })
		.from(spotifyBlacklist)
		.where(conditions)
	const count = countRes[0]?.count || 0

	const blacklistItems = await db
		.select({
			id: spotifyBlacklist.id,
			trackId: spotifyBlacklist.trackId,
			title: spotifyBlacklist.title,
			artist: spotifyBlacklist.artist,
			albumArt: spotifyBlacklist.albumArt,
			addedBy: spotifyBlacklist.addedBy,
			addedByImage: users.image,
			createdAt: spotifyBlacklist.createdAt,
		})
		.from(spotifyBlacklist)
		.leftJoin(users, or(
			eq(users.displayName, spotifyBlacklist.addedBy),
			eq(users.username, spotifyBlacklist.addedBy),
		))
		.where(conditions)
		.orderBy(desc(spotifyBlacklist.createdAt))
		.limit(limit)
		.offset((page - 1) * limit)

	return {
		data: blacklistItems,
		meta: buildPaginationMeta(count, page, limit),
	}
})
