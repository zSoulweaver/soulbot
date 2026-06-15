import { sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '~~/server/database'
import { settings } from '~~/server/database/schema'
import { requireUserRole } from '~~/server/utils/auth'
import { refreshAppSettingsCache } from '~~/server/utils/settings'

const saveGamblingSettingsSchema = z.object({
	minBet: z.number().int().min(1, 'Minimum bet must be at least 1'),
	maxBet: z.number().int().min(1, 'Maximum bet must be at least 1'),
	winMinRoll: z.number().int().min(1, 'Threshold must be between 1 and 100').max(100, 'Threshold must be between 1 and 100'),
	winMultiplier: z.number().min(0.1, 'Multiplier must be at least 0.1'),
}).refine(data => data.maxBet >= data.minBet, {
	message: 'Maximum bet must be greater than or equal to minimum bet',
	path: ['maxBet'],
})

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'caster')
	const body = await readBody(event)
	const parsed = saveGamblingSettingsSchema.safeParse(body)

	if (!parsed.success) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid gambling settings data',
			data: parsed.error.format(),
		})
	}

	const { minBet, maxBet, winMinRoll, winMultiplier } = parsed.data

	const keysToUpsert = [
		{ key: 'points.gambling_min_bet', value: String(minBet), updatedAt: new Date() },
		{ key: 'points.gambling_max_bet', value: String(maxBet), updatedAt: new Date() },
		{ key: 'points.gambling_win_min_roll', value: String(winMinRoll), updatedAt: new Date() },
		{ key: 'points.gambling_win_multiplier', value: String(winMultiplier), updatedAt: new Date() },
	]

	await db
		.insert(settings)
		.values(keysToUpsert)
		.onConflictDoUpdate({
			target: settings.key,
			set: {
				value: sql`excluded.value`,
				updatedAt: sql`excluded.updated_at`,
			},
		})

	await refreshAppSettingsCache()

	return { success: true }
})
