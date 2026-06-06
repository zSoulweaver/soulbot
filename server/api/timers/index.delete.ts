import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { lastTriggerMessageCountMap } from '~~/server/bot/modules/timers'
import { requireUserRole } from '~~/server/utils/auth'
import { db } from '../../database'
import { timers } from '../../database/schema'

const deleteTimerSchema = z.object({
	id: z.string().min(1),
})

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')
	const body = await readBody(event)
	const parsed = deleteTimerSchema.safeParse(body)

	if (!parsed.success) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid timer deletion payload',
			data: parsed.error.format(),
		})
	}

	const { id } = parsed.data

	await db.delete(timers).where(eq(timers.id, id))

	// Clean up memory cache
	lastTriggerMessageCountMap.delete(id)

	return { success: true }
})
