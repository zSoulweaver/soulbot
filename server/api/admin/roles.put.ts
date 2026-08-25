import { z } from 'zod'
import { cleanUsername } from '~~/server/bot/core/utils'
import { db } from '~~/server/database'
import { users } from '~~/server/database/schema'
import { requireStrictCaster, updateUserRoleCache } from '~~/server/utils/auth'

const updateRoleSchema = z.object({
	userId: z.string().min(1, 'User ID is required'),
	username: z.string().min(1, 'Username is required'),
	displayName: z.string().min(1, 'Display name is required'),
	isAdmin: z.boolean(),
})

export default defineEventHandler(async (event) => {
	const user = await requireStrictCaster(event)

	const body = await readBody(event)
	const parsed = updateRoleSchema.safeParse(body)

	if (!parsed.success) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid role update data',
			data: parsed.error.format(),
		})
	}

	const { userId, username, displayName, isAdmin } = parsed.data

	// Prevent caster from altering their own role
	if (userId === user.id) {
		throw createError({
			statusCode: 400,
			statusMessage: 'You cannot alter your own caster role.',
		})
	}

	const targetRole = isAdmin ? 'admin' : 'moderator'
	const now = new Date()

	// Update or insert the user
	await db.insert(users)
		.values({
			id: userId,
			username: cleanUsername(username),
			displayName,
			role: targetRole,
			createdAt: now,
			updatedAt: now,
		})
		.onConflictDoUpdate({
			target: users.id,
			set: {
				role: targetRole,
				updatedAt: now,
			},
		})

	// Instantly update/sync the in-memory cache
	updateUserRoleCache(userId, targetRole)

	return { success: true }
})
