import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { getGlobalMessageCount, lastTriggerMessageCountMap } from '~~/server/bot/modules/timers'
import { requireUserRole } from '~~/server/utils/auth'
import { db } from '../../database'
import { timers } from '../../database/schema'

const timerMessageSchema = z.object({
	text: z.string().min(1, 'Message text cannot be empty'),
	enabled: z.boolean().default(true),
})

const updateTimerSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1, 'Name is required'),
	enabled: z.boolean(),
	messages: z.array(timerMessageSchema).default([]),
	intervalOnline: z.preprocess(value => (value === null || value === undefined || value === '' || Number.isNaN(Number(value)) ? 0 : Number(value)), z.number().int().nonnegative()),
	intervalOffline: z.preprocess(value => (value === null || value === undefined || value === '' || Number.isNaN(Number(value)) ? 0 : Number(value)), z.number().int().nonnegative()),
	minMessages: z.preprocess(value => (value === null || value === undefined || value === '' || Number.isNaN(Number(value)) ? 0 : Number(value)), z.number().int().nonnegative()),
})

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')
	const body = await readBody(event)
	const parsed = updateTimerSchema.safeParse(body)

	if (!parsed.success) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid timer configuration data',
			data: parsed.error.format(),
		})
	}

	const { id, name, enabled, messages, intervalOnline, intervalOffline, minMessages } = parsed.data

	const existingRecord = await db
		.select()
		.from(timers)
		.where(eq(timers.id, id))
		.then(res => res[0])

	if (!existingRecord) {
		throw createError({
			statusCode: 404,
			statusMessage: 'Timer not found',
		})
	}

	// Clamp lastSentIndex to ensure no index out of bounds
	const lastSentIndex = Math.max(0, Math.min(existingRecord.lastSentIndex, messages.length - 1))

	// If the timer is toggled from disabled -> enabled, reset lastTriggeredAt to now so it waits a full interval
	let lastTriggeredAt = existingRecord.lastTriggeredAt
	if (enabled && !existingRecord.enabled) {
		lastTriggeredAt = new Date()
		lastTriggerMessageCountMap.set(id, getGlobalMessageCount())
	}

	await db
		.update(timers)
		.set({
			name,
			enabled,
			messages,
			lastSentIndex,
			intervalOnline,
			intervalOffline,
			minMessages,
			lastTriggeredAt,
			updatedAt: new Date(),
		})
		.where(eq(timers.id, id))

	return { success: true }
})
