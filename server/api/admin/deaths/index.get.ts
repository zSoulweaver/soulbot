import { desc, like, sql } from 'drizzle-orm'
import { getCurrentGameName } from '~~/server/bot/modules/deaths/utils'
import { db } from '~~/server/database'
import { gameDeaths } from '~~/server/database/schema'
import { requireUserRole } from '~~/server/utils/auth'
import { buildPaginationMeta, parsePaginationParams } from '~~/server/utils/pagination'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')
	const { page, limit, search } = parsePaginationParams(event)

	let conditions
	if (search) {
		conditions = like(gameDeaths.gameName, `%${search}%`)
	}

	const countRes = await db
		.select({ count: sql<number>`count(*)` })
		.from(gameDeaths)
		.where(conditions)
	const count = countRes[0]?.count || 0

	const items = await db
		.select()
		.from(gameDeaths)
		.where(conditions)
		.orderBy(desc(gameDeaths.updatedAt))
		.limit(limit)
		.offset((page - 1) * limit)

	const currentGame = await getCurrentGameName()

	return {
		data: items,
		currentGame,
		meta: buildPaginationMeta(count, page, limit),
	}
})
