import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '~~/server/database'
import { settings } from '~~/server/database/schema'

const saveSettingsSchema = z.object({
	interval: z.number().int().min(1, 'Payout interval must be at least 1 minute'),
	amount: z.number().int().min(0, 'Payout amount must be non-negative'),
})

export default defineEventHandler(async (event) => {
	const body = await readBody(event)
	const parsed = saveSettingsSchema.safeParse(body)

	if (!parsed.success) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid points settings data',
			data: parsed.error.format(),
		})
	}

	const { interval, amount } = parsed.data

	const keysToUpsert = [
		{ key: 'points.payout_interval', value: String(interval) },
		{ key: 'points.payout_amount', value: String(amount) },
	]

	for (const item of keysToUpsert) {
		const existing = await db
			.select()
			.from(settings)
			.where(eq(settings.key, item.key))
			.then(res => res[0])

		if (existing) {
			await db
				.update(settings)
				.set({
					value: item.value,
					updatedAt: new Date(),
				})
				.where(eq(settings.key, item.key))
		}
		else {
			await db.insert(settings).values({
				key: item.key,
				value: item.value,
				updatedAt: new Date(),
			})
		}
	}

	return { success: true }
})
