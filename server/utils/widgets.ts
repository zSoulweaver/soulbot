import type { H3Event } from 'h3'
import type { WidgetStyles } from '~~/server/database/schema'
import crypto from 'node:crypto'
import { eq } from 'drizzle-orm'
import { botEventBus } from '~~/server/bot/core/events'
import { db } from '~~/server/database'
import { settings, widgets } from '~~/server/database/schema'

export const WIDGET_SECRET_KEY_SETTING = 'widget_secret_key'

export const DEFAULT_DEATH_WIDGET_STYLES: WidgetStyles = {
	fontFamily: 'Inter',
	fontSize: 36,
	fontWeight: '700',
	color: '#ffffff',
	backgroundColor: 'transparent',
	textAlign: 'center',
	customCss: '',
}

export const DEFAULT_DEATH_WIDGET_TEMPLATE = '{game} Deaths: {count}'

/**
 * Gets or creates the global secret key for OBS widgets.
 */
export async function getWidgetSecretKey(): Promise<string> {
	const existing = await db.query.settings.findFirst({
		where: eq(settings.key, WIDGET_SECRET_KEY_SETTING),
	})

	if (existing && existing.value) {
		return existing.value
	}

	const newKey = crypto.randomBytes(24).toString('hex')
	await db.insert(settings).values({
		key: WIDGET_SECRET_KEY_SETTING,
		value: newKey,
		updatedAt: new Date(),
	}).onConflictDoUpdate({
		target: settings.key,
		set: { value: newKey, updatedAt: new Date() },
	})

	return newKey
}

/**
 * Regenerates the global secret key for OBS widgets, revoking access to previous key.
 */
export async function regenerateWidgetSecretKey(): Promise<string> {
	const newKey = crypto.randomBytes(24).toString('hex')
	await db.insert(settings).values({
		key: WIDGET_SECRET_KEY_SETTING,
		value: newKey,
		updatedAt: new Date(),
	}).onConflictDoUpdate({
		target: settings.key,
		set: { value: newKey, updatedAt: new Date() },
	})
	return newKey
}

/**
 * Validates key query parameter against global widget secret key.
 */
export async function validateWidgetSecretKey(event: H3Event): Promise<boolean> {
	const query = getQuery(event)
	const key = typeof query.key === 'string' ? query.key : ''
	if (!key) {
		throw createError({
			statusCode: 401,
			statusMessage: 'Unauthorized: Missing widget secret key',
		})
	}

	const validKey = await getWidgetSecretKey()
	if (key !== validKey) {
		throw createError({
			statusCode: 403,
			statusMessage: 'Forbidden: Invalid widget secret key',
		})
	}

	return true
}

/**
 * Retrieves configuration for a specific widget, creating defaults if missing.
 */
export async function getWidgetConfig(id: string) {
	const existing = await db.query.widgets.findFirst({
		where: eq(widgets.id, id),
	})

	if (existing) {
		return existing
	}

	if (id === 'deaths') {
		const [created] = await db.insert(widgets).values({
			id: 'deaths',
			name: 'Death Counter',
			enabled: true,
			template: DEFAULT_DEATH_WIDGET_TEMPLATE,
			styles: DEFAULT_DEATH_WIDGET_STYLES,
		}).returning()
		if (!created) {
			throw createError({
				statusCode: 500,
				statusMessage: 'Failed to initialize default death counter widget',
			})
		}
		return created
	}

	throw createError({
		statusCode: 404,
		statusMessage: `Widget "${id}" not found`,
	})
}

/**
 * Updates a widget's template, styles, or enabled state and emits widget:updated.
 */
export async function updateWidgetConfig(id: string, data: { template?: string, styles?: WidgetStyles, enabled?: boolean }) {
	const current = await getWidgetConfig(id)

	const updatedTemplate = typeof data.template === 'string' ? data.template : current.template
	const updatedStyles = data.styles ? { ...current.styles, ...data.styles } : current.styles
	const updatedEnabled = typeof data.enabled === 'boolean' ? data.enabled : current.enabled

	const [updated] = await db.update(widgets)
		.set({
			template: updatedTemplate,
			styles: updatedStyles,
			enabled: updatedEnabled,
			updatedAt: new Date(),
		})
		.where(eq(widgets.id, id))
		.returning()

	if (updated) {
		botEventBus.emit('widget:updated', {
			widgetId: id,
			template: updated.template,
			styles: updated.styles,
		})
	}

	return updated || current
}
