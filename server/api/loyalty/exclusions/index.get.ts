import { desc, like, or, sql } from 'drizzle-orm'
import { db } from '~~/server/database'
import { excludedUsers } from '~~/server/database/schema'
import { requireUserRole } from '~~/server/utils/auth'
import { buildPaginationMeta, parsePaginationParams } from '~~/server/utils/pagination'
import { getBotToken } from '~~/server/utils/twurple'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')
	const { page, limit, search } = parsePaginationParams(event)

	let conditions
	if (search) {
		conditions = or(
			like(excludedUsers.username, `%${search.toLowerCase()}%`),
			like(excludedUsers.displayName, `%${search.toLowerCase()}%`),
			like(excludedUsers.reason, `%${search.toLowerCase()}%`),
		)
	}

	const countRes = await db
		.select({ count: sql<number>`count(*)` })
		.from(excludedUsers)
		.where(conditions)
	const count = countRes[0]?.count || 0

	const manual = await db
		.select()
		.from(excludedUsers)
		.where(conditions)
		.orderBy(desc(excludedUsers.createdAt))
		.limit(limit)
		.offset((page - 1) * limit)

	const botToken = await getBotToken()

	const autoExclusions = []
	if (botToken) {
		autoExclusions.push({
			username: botToken.userName,
			displayName: botToken.displayName,
		})
	}

	return {
		manualExclusions: {
			data: manual,
			meta: buildPaginationMeta(count, page, limit),
		},
		autoExclusions,
	}
})
