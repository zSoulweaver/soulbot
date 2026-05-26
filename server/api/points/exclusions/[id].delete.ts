import { eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { excludedUsers } from '~~/server/database/schema'
import { requireUserRole } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')

	const id = getRouterParam(event, 'id')
	if (!id) {
		throw createError({
			statusCode: 400,
			statusMessage: 'User ID is required',
		})
	}

	await db.delete(excludedUsers).where(eq(excludedUsers.id, id))

	return { success: true }
})
