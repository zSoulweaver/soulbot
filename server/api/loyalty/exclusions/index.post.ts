import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { cleanUsername } from '~~/server/bot/core/utils'
import { db } from '~~/server/database'
import { excludedUsers } from '~~/server/database/schema'
import { requireUserRole } from '~~/server/utils/auth'
import { getApiClient, getBotToken } from '~~/server/utils/twurple'

const addExclusionSchema = z.object({
	username: z.string().min(1, 'Twitch username is required'),
	reason: z.string().optional(),
})

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')

	const body = await readValidatedBody(event, addExclusionSchema.safeParse)
	if (!body.success) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid exclusion data',
			data: body.error.format(),
		})
	}

	const cleaned = cleanUsername(body.data.username)
	const api = getApiClient()
	const twitchUser = await api.users.getUserByName(cleaned)

	if (!twitchUser) {
		throw createError({
			statusCode: 404,
			statusMessage: 'Twitch account not found. Please verify the username.',
		})
	}

	// Check if already manually excluded
	const existing = await db.select().from(excludedUsers).where(eq(excludedUsers.id, twitchUser.id)).then(res => res[0])
	if (existing) {
		throw createError({
			statusCode: 400,
			statusMessage: 'This user is already on the exclusion list.',
		})
	}

	// Check if system bot
	const botToken = await getBotToken()
	if (botToken && botToken.userId === twitchUser.id) {
		throw createError({
			statusCode: 400,
			statusMessage: 'This is the system bot account. It is automatically excluded.',
		})
	}

	const [newExclusion] = await db.insert(excludedUsers).values({
		id: twitchUser.id,
		username: twitchUser.name, // Twurple guarantees this is lowercase
		displayName: twitchUser.displayName,
		reason: body.data.reason || null,
		createdAt: new Date(),
	}).returning()

	return { success: true, user: newExclusion }
})
