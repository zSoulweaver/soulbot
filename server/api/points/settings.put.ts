import { sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '~~/server/database'
import { settings } from '~~/server/database/schema'
import { refreshAppSettingsCache } from '~~/server/utils/settings'

const saveSettingsSchema = z.object({
	currencyName: z.string().min(1, 'Currency singular name is required'),
	currencyNamePlural: z.string().min(1, 'Currency plural name is required'),
	payoutInterval: z.number().int().min(1, 'Payout interval must be at least 1 minute'),
	payoutIntervalOffline: z.number().int().min(1, 'Offline payout interval must be at least 1 minute'),
	payoutAmount: z.number().int().min(0, 'Payout amount must be non-negative'),
	payoutAmountOffline: z.number().int().min(0, 'Offline payout amount must be non-negative'),
	activeBonus: z.number().int().min(0, 'Active bonus must be non-negative'),
})

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'caster')
	const body = await readBody(event)
	const parsed = saveSettingsSchema.safeParse(body)

	if (!parsed.success) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid points settings data',
			data: parsed.error.format(),
		})
	}

	const {
		currencyName,
		currencyNamePlural,
		payoutInterval,
		payoutIntervalOffline,
		payoutAmount,
		payoutAmountOffline,
		activeBonus,
	} = parsed.data

	const keysToUpsert = [
		{ key: 'points.currency_name', value: currencyName, updatedAt: new Date() },
		{ key: 'points.currency_name_plural', value: currencyNamePlural, updatedAt: new Date() },
		{ key: 'points.payout_interval', value: String(payoutInterval), updatedAt: new Date() },
		{ key: 'points.payout_interval_offline', value: String(payoutIntervalOffline), updatedAt: new Date() },
		{ key: 'points.payout_amount', value: String(payoutAmount), updatedAt: new Date() },
		{ key: 'points.payout_amount_offline', value: String(payoutAmountOffline), updatedAt: new Date() },
		{ key: 'points.active_bonus', value: String(activeBonus), updatedAt: new Date() },
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

	// Dynamic cache reload in memory
	await refreshAppSettingsCache()

	return { success: true }
})
