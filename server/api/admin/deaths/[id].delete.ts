import { eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { gameDeaths } from '~~/server/database/schema'
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

	await db.delete(gameDeaths).where(eq(gameDeaths.id, id))

	return { success: true }
})
