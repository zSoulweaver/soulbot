import { db } from '../../database'
import { commandTemplates } from '../../database/schema'

/**
 * This interface is intended to be augmented by modules to provide
 * type-safe templates and their parameters.
 */
export interface CommandTemplates {}

export type TemplateName = keyof CommandTemplates
export type TemplateData<T extends TemplateName> = CommandTemplates[T]

export interface TemplateDefinition {
	id: string
	default: string
	params?: readonly string[]
	description?: string
}

class TemplateRegistry {
	private templates = new Map<string, TemplateDefinition>()
	private overrides = new Map<string, string>()

	register(definition: TemplateDefinition) {
		console.log(`[Templates] Registering: ${definition.id}`)
		this.templates.set(definition.id, definition)
	}

	async syncWithDb() {
		const dbTemplates = await db.select().from(commandTemplates)
		this.overrides.clear()
		for (const row of dbTemplates) {
			this.overrides.set(row.id, row.template)
		}
	}

	get(id: string) {
		return this.templates.get(id)
	}

	all() {
		return Array.from(this.templates.values()).map(def => ({
			...def,
			current: this.overrides.get(def.id) || def.default,
			isOverridden: this.overrides.has(def.id),
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

		for (const [key, value] of Object.entries(data)) {
			text = text.replaceAll(`\${${key}}`, String(value))
		}
		return text
	}
}

export const templateRegistry = new TemplateRegistry()
