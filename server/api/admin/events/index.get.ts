import { and, desc, eq, like, or, sql } from 'drizzle-orm'
import { db } from '~~/server/database'
import { eventsLog } from '~~/server/database/schema'
import { requireUserRole } from '~~/server/utils/auth'
import { buildPaginationMeta, parsePaginationParams } from '~~/server/utils/pagination'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')
	const { page, limit, search } = parsePaginationParams(event)
	const query = getQuery(event) || {}
	const typeFilter = query.type ? String(query.type) : undefined

	const conditions = []

	if (typeFilter && typeFilter !== 'all') {
		conditions.push(eq(eventsLog.type, typeFilter))
	}

	if (search) {
		conditions.push(
			or(
				like(eventsLog.userName, `%${search.toLowerCase()}%`),
				like(eventsLog.displayName, `%${search.toLowerCase()}%`),
			),
		)
	}

	const whereClause = conditions.length > 0 ? and(...conditions) : undefined

	const countRes = await db
		.select({ count: sql<number>`count(*)` })
		.from(eventsLog)
		.where(whereClause)
	const count = countRes[0]?.count || 0

	const items = await db
		.select()
		.from(eventsLog)
		.where(whereClause)
		.orderBy(desc(eventsLog.createdAt))
		.limit(limit)
		.offset((page - 1) * limit)

	return {
		data: items,
		meta: buildPaginationMeta(count, page, limit),
	}
})
