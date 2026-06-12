import { eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { spotifyBlacklist } from '~~/server/database/schema'
import { requireUserRole } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')

	const idParam = getRouterParam(event, 'id')
	if (!idParam) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Blacklist Item ID is required',
		})
	}

	const id = Number(idParam)
	if (Number.isNaN(id)) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid Blacklist Item ID',
		})
	}

	await db.delete(spotifyBlacklist).where(eq(spotifyBlacklist.id, id))

	return { success: true }
})
