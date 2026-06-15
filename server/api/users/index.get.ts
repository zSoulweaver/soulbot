import { desc, like, or, sql } from 'drizzle-orm'
import { requireUserRole } from '~~/server/utils/auth'
import { buildPaginationMeta, parsePaginationParams } from '~~/server/utils/pagination'
import { db } from '../../database'
import { users } from '../../database/schema'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')
	const { page, limit, search } = parsePaginationParams(event)

	let conditions
	if (search) {
		conditions = or(
			like(users.username, `%${search.toLowerCase()}%`),
			like(users.displayName, `%${search.toLowerCase()}%`),
		)
	}

	const query = getQuery(event) || {}
	const sortBy = query.sortBy === 'watchTime' ? 'watchTime' : 'points'

	const countRes = await db
		.select({ count: sql<number>`count(*)` })
		.from(users)
		.where(conditions)
	const count = countRes[0]?.count || 0

	const allUsers = await db
		.select()
		.from(users)
		.where(conditions)
		.orderBy(sortBy === 'watchTime' ? desc(users.watchTime) : desc(users.points))
		.limit(limit)
		.offset((page - 1) * limit)

	return {
		data: allUsers,
		meta: buildPaginationMeta(count, page, limit),
	}
})
