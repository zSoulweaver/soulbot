import { desc, eq, like, or, sql } from 'drizzle-orm'
import { db } from '~~/server/database'
import { excludedUsers, users } from '~~/server/database/schema'
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
		.select({
			id: excludedUsers.id,
			username: excludedUsers.username,
			displayName: excludedUsers.displayName,
			reason: excludedUsers.reason,
			createdAt: excludedUsers.createdAt,
			image: users.image,
		})
		.from(excludedUsers)
		.leftJoin(users, eq(users.id, excludedUsers.id))
		.where(conditions)
		.orderBy(desc(excludedUsers.createdAt))
		.limit(limit)
		.offset((page - 1) * limit)

	const botToken = await getBotToken()

	const autoExclusions = []
	if (botToken) {
		const botDbUser = botToken.userId
			? await db.select({ image: users.image }).from(users).where(eq(users.id, botToken.userId)).then(r => r[0])
			: null

		autoExclusions.push({
			username: botToken.userName,
			displayName: botToken.displayName,
			image: botDbUser?.image || null,
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
