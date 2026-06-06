import { z } from 'zod'
import { requireUserRole } from '~~/server/utils/auth'
import { db } from '../../database'
import { timers } from '../../database/schema'

const timerMessageSchema = z.object({
	text: z.string().min(1, 'Message text cannot be empty'),
	enabled: z.boolean().default(true),
})

const createTimerSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	enabled: z.boolean().default(true),
	messages: z.array(timerMessageSchema).default([]),
	intervalOnline: z.preprocess(value => (value === null || value === undefined || value === '' || Number.isNaN(Number(value)) ? 0 : Number(value)), z.number().int().nonnegative()),
	intervalOffline: z.preprocess(value => (value === null || value === undefined || value === '' || Number.isNaN(Number(value)) ? 0 : Number(value)), z.number().int().nonnegative()),
	minMessages: z.preprocess(value => (value === null || value === undefined || value === '' || Number.isNaN(Number(value)) ? 0 : Number(value)), z.number().int().nonnegative()),
})

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')
	const body = await readBody(event)
	const parsed = createTimerSchema.safeParse(body)

	if (!parsed.success) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid timer configuration data',
			data: parsed.error.format(),
		})
	}

	const { name, enabled, messages, intervalOnline, intervalOffline, minMessages } = parsed.data
	const id = `timer_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

	await db.insert(timers).values({
		id,
		name,
		enabled,
		messages,
		lastSentIndex: 0,
		intervalOnline,
		intervalOffline,
		minMessages,
		lastTriggeredAt: new Date(),
		createdAt: new Date(),
		updatedAt: new Date(),
	})

	return { success: true, id }
})
