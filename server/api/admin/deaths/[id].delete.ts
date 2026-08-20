import { eq } from 'drizzle-orm'
import { clearDeathsCache } from '~~/server/bot/modules/deaths/utils'
import { db } from '~~/server/database'
import { gameDeathCounters, games } from '~~/server/database/schema'
import { requireUserRole } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')
	const idParam = getRouterParam(event, 'id')
	const id = Number(idParam)

	if (!id || Number.isNaN(id)) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid ID',
		})
	}

	await db.delete(gameDeathCounters).where(eq(gameDeathCounters.gameId, id))
	await db.delete(games).where(eq(games.id, id))
	await clearDeathsCache()

	return { success: true }
})
