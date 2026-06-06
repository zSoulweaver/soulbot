import { asc, like, sql } from 'drizzle-orm'
import { requireUserRole } from '~~/server/utils/auth'
import { buildPaginationMeta, parsePaginationParams } from '~~/server/utils/pagination'
import { db } from '../../database'
import { timers } from '../../database/schema'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')
	const { page, limit, search } = parsePaginationParams(event)

	let conditions
	if (search) {
		conditions = like(timers.name, `%${search.toLowerCase()}%`)
	}

	const countRes = await db
		.select({ count: sql<number>`count(*)` })
		.from(timers)
		.where(conditions)
	const count = countRes[0]?.count || 0

	const paginatedTimers = await db
		.select()
		.from(timers)
		.where(conditions)
		.orderBy(asc(timers.name))
		.limit(limit)
		.offset((page - 1) * limit)

	return {
		data: paginatedTimers,
		meta: buildPaginationMeta(count, page, limit),
	}
})
