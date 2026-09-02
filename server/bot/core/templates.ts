import { db } from '~~/server/database'
import { commandTemplates } from '~~/server/database/schema'
import { pointsSettings } from '~~/server/settings'
import { botLogger } from '~~/server/utils/logger'
import { createTemplateContext, renderCustomTemplate } from './variables-engine'

/**
 * Helper type to extract parameters from template definitions
 */
export type MapTemplates<TemplatesMap extends Record<string, any>> = {
	[TemplateKey in keyof TemplatesMap]: TemplatesMap[TemplateKey]['params']
}

export interface TemplateParamMeta {
	label?: string
	description?: string
	example?: string | number
}

export interface TemplateSource {
	default: string
	params?: Record<string, any> | undefined
	paramDescriptions?: Record<string, string> | undefined
	paramMeta?: Record<string, TemplateParamMeta> | undefined
}

export type TemplateSourceMap = Record<string, TemplateSource>

/**
 * This interface is intended to be augmented by modules to provide
 * type-safe templates and their parameters.
 */
export interface CommandTemplates {}

export interface TemplateParamDefinition {
	name: string
	label: string
	description: string
	example: string | number
}

export interface TemplateDefinition {
	id: string
	default: string
	params?: readonly TemplateParamDefinition[]
}

export function buildTemplateParams(
	params?: Record<string, any>,
	paramMeta?: Record<string, TemplateParamMeta>,
	paramDescriptions?: Record<string, string>,
): TemplateParamDefinition[] {
	if (!params)
		return []

	return Object.keys(params).map((key) => {
		const meta = paramMeta?.[key]
		const desc = meta?.description || paramDescriptions?.[key] || ''
		const label = meta?.label || key
		const example = meta?.example ?? (typeof params[key] === 'number' ? (params[key] || 100) : (params[key] || key))

		return {
			name: key,
			label,
			description: desc,
			example,
		}
	})
}

export function getGlobalTemplateVariables(data: Record<string, string | number>): Record<string, string | number> {
	const vars: Record<string, string | number> = {}

	// Currency Names
	const settings = pointsSettings.get()
	vars['core.currency_singular'] = settings.currencyName
	vars['core.currency_plural'] = settings.currencyNamePlural

	// Dynamic Currency (automatically pluralized based on `data.amount` or `data.points` if present)
	const amtVal = data.amount !== undefined ? Number(data.amount) : (data.points !== undefined ? Number(data.points) : null)
	if (amtVal !== null) {
		vars['core.currency'] = amtVal === 1 ? settings.currencyName : settings.currencyNamePlural
	}
	else {
		// Default to plural if no amount context is provided
		vars['core.currency'] = settings.currencyNamePlural
	}

	return vars
}

class TemplateRegistry {
	private templates = new Map<string, TemplateDefinition>()
	private overrides = new Map<string, string>()
	private syncPromise: Promise<void> | null = null

	register(definition: TemplateDefinition) {
		botLogger.info('[Templates] Registering: %s', definition.id)
		this.templates.set(definition.id, definition)
	}

	async syncWithDb(): Promise<void> {
		if (this.syncPromise) {
			return this.syncPromise
		}
		this.syncPromise = this.performSyncWithDb().finally(() => {
			this.syncPromise = null
		})
		return this.syncPromise
	}

	private async performSyncWithDb() {
		const databaseTemplates = await db.select().from(commandTemplates)
		this.overrides.clear()
		for (const templateRow of databaseTemplates) {
			this.overrides.set(templateRow.id, templateRow.template)
		}
	}

	get(id: string) {
		return this.templates.get(id)
	}

	all() {
		return Array.from(this.templates.values()).map(definition => ({
			...definition,
			current: this.overrides.get(definition.id) || definition.default,
			isOverridden: this.overrides.has(definition.id),
		}))
	}

	render(id: string, data: Record<string, string | number> = {}) {
		const definition = this.get(id)
		if (!definition) {
			console.warn(`[Templates] Template "${id}" not found. Falling back to key/value dump.`)
			return `${id}: ${JSON.stringify(data)}`
		}

		// Use override if available, otherwise fallback to default
		let text = this.overrides.get(id) || definition.default

		const mergedData = {
			...getGlobalTemplateVariables(data),
			...data,
		}

		for (const [key, value] of Object.entries(mergedData)) {
			text = text.replaceAll(`$(${key})`, String(value))
		}
		return text
	}

	async renderAsync(id: string, ctx?: any, data: Record<string, string | number> = {}): Promise<string> {
		const definition = this.get(id)
		if (!definition) {
			console.warn(`[Templates] Template "${id}" not found. Falling back to key/value dump.`)
			return `${id}: ${JSON.stringify(data)}`
		}

		const text = this.overrides.get(id) || definition.default
		const channel = ctx?.channel || 'streamer'
		const effectiveCtx = ctx || createTemplateContext(channel)

		return renderCustomTemplate(text, effectiveCtx, data)
	}
}

export const templateRegistry = new TemplateRegistry()
