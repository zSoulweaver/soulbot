import { sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '~~/server/database'
import { settings } from '~~/server/database/schema'
import { requireUserRole } from '~~/server/utils/auth'
import { refreshAppSettingsCache } from '~~/server/utils/settings'

const saveVaultSettingsSchema = z.object({
	minBet: z.number().int().min(1, 'Minimum bet must be at least 1'),
	maxBet: z.number().int().min(1, 'Maximum bet must be at least 1'),
	winMinRoll: z.number().int().min(1, 'Threshold must be between 1 and 100').max(100, 'Threshold must be between 1 and 100'),
	winMultiplier: z.number().min(0.1, 'Multiplier must be at least 0.1'),
	duration: z.number().int().min(15, 'Duration must be between 15 and 300 seconds').max(300, 'Duration must be between 15 and 300 seconds'),
	warningEnabled: z.boolean(),
	startMessage: z.string().min(1, 'Start announcement message cannot be empty'),
	warningMessage: z.string().min(1, 'Warning announcement message cannot be empty'),
	endWinMessage: z.string().min(1, 'Win announcement message cannot be empty'),
	endLoseMessage: z.string().min(1, 'Lose announcement message cannot be empty'),
}).refine(data => data.maxBet >= data.minBet, {
	message: 'Maximum bet must be greater than or equal to minimum bet',
	path: ['maxBet'],
})

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'caster')
	const body = await readBody(event)
	const parsed = saveVaultSettingsSchema.safeParse(body)

	if (!parsed.success) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid vault settings data',
			data: parsed.error.format(),
		})
	}

	const {
		minBet,
		maxBet,
		winMinRoll,
		winMultiplier,
		duration,
		warningEnabled,
		startMessage,
		warningMessage,
		endWinMessage,
		endLoseMessage,
	} = parsed.data

	const keysToUpsert = [
		{ key: 'points.vault_min_bet', value: String(minBet), updatedAt: new Date() },
		{ key: 'points.vault_max_bet', value: String(maxBet), updatedAt: new Date() },
		{ key: 'points.vault_win_min_roll', value: String(winMinRoll), updatedAt: new Date() },
		{ key: 'points.vault_win_multiplier', value: String(winMultiplier), updatedAt: new Date() },
		{ key: 'points.vault_duration', value: String(duration), updatedAt: new Date() },
		{ key: 'points.vault_warning_enabled', value: String(warningEnabled), updatedAt: new Date() },
		{ key: 'points.vault_start_message', value: startMessage, updatedAt: new Date() },
		{ key: 'points.vault_warning_message', value: warningMessage, updatedAt: new Date() },
		{ key: 'points.vault_end_win_message', value: endWinMessage, updatedAt: new Date() },
		{ key: 'points.vault_end_lose_message', value: endLoseMessage, updatedAt: new Date() },
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
