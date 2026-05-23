import { db } from '~~/server/database'
import { commandTemplates } from '~~/server/database/schema'
import { botLogger } from '~~/server/utils/logger'
import { getAppSettingsSync } from '~~/server/utils/settings'

/**
 * Helper type to extract parameters from template definitions
 */
export type MapTemplates<TemplatesMap extends Record<string, any>> = {
	[TemplateKey in keyof TemplatesMap]: TemplatesMap[TemplateKey]['params']
}

export interface TemplateSource {
	default: string
	params?: Record<string, any> | undefined
}

export type TemplateSourceMap = Record<string, TemplateSource>

/**
 * This interface is intended to be augmented by modules to provide
 * type-safe templates and their parameters.
 */
export interface CommandTemplates {}

export interface TemplateDefinition {
	id: string
	default: string
	params?: readonly string[]
}

function getGlobalTemplateVariables(data: Record<string, string | number>): Record<string, string | number> {
	const vars: Record<string, string | number> = {}

	// Currency Names
	const settings = getAppSettingsSync()
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

	register(definition: TemplateDefinition) {
		botLogger.info('[Templates] Registering: %s', definition.id)
		this.templates.set(definition.id, definition)
	}

	async syncWithDb() {
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

	render(id: string, data: Record<string, string | number>) {
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
			text = text.replaceAll(`\${${key}}`, String(value))
		}
		return text
	}
}

export const templateRegistry = new TemplateRegistry()
