import { sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '~~/server/database'
import { settings } from '~~/server/database/schema'
import { requireUserRole } from '~~/server/utils/auth'
import { refreshAppSettingsCache } from '~~/server/utils/settings'

const saveAdSettingsSchema = z.object({
	adsAlertsEnabled: z.boolean(),
	adsAlert5mEnabled: z.boolean(),
	adsAlert3mEnabled: z.boolean(),
	adsAlert1mEnabled: z.boolean(),
	adsAlertTemplate: z.string().max(500, 'Warning alert template is too long'),
})

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'caster')
	const body = await readBody(event)
	const parsed = saveAdSettingsSchema.safeParse(body)

	if (!parsed.success) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid advertisement settings data',
			data: parsed.error.format(),
		})
	}

	const d = parsed.data

	const keysToUpsert = [
		{ key: 'ads.alerts.enabled', value: String(d.adsAlertsEnabled), updatedAt: new Date() },
		{ key: 'ads.alerts.5m.enabled', value: String(d.adsAlert5mEnabled), updatedAt: new Date() },
		{ key: 'ads.alerts.3m.enabled', value: String(d.adsAlert3mEnabled), updatedAt: new Date() },
		{ key: 'ads.alerts.1m.enabled', value: String(d.adsAlert1mEnabled), updatedAt: new Date() },
		{ key: 'ads.alerts.template', value: d.adsAlertTemplate, updatedAt: new Date() },
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
