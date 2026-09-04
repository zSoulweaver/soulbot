import type {
	TemplateCategory,
	TemplateDomain,
	TemplateParamDefinition,
	TemplateVariableMeta,
} from '~~/shared/types/templates'
import { eq, sql } from 'drizzle-orm'
import { db } from '~~/server/database'
import { commandTemplates, generalTemplates } from '~~/server/database/schema'
import { pointsSettings } from '~~/server/settings'
import { botLogger } from '~~/server/utils/logger'
import { GLOBAL_TEMPLATE_VARIABLES } from '~~/shared/types/templates'
import { registerScopeVariablesResolver } from '~~/shared/utils/template-validator'
import { createTemplateContext, renderCustomTemplate } from './variables-engine'

export type {
	TemplateCategory,
	TemplateDomain,
	TemplateParamDefinition,
	TemplateVariableMeta,
}
export { GLOBAL_TEMPLATE_VARIABLES }

export interface TemplateParamConfig {
	label?: string
	description?: string
	example?: string | number | boolean
	type?: 'string' | 'number' | 'boolean'
	category?: 'event' | 'global' | 'custom'
}

export interface TemplateConfig<P extends Record<string, TemplateParamConfig> = Record<string, TemplateParamConfig>> {
	name?: string
	description?: string
	default: string
	category?: TemplateCategory
	domain?: TemplateDomain
	editUrl?: string
	params?: P
}

export interface DefineTemplatesOptions<T extends Record<string, TemplateConfig>> {
	domain?: TemplateDomain
	category?: TemplateCategory
	editUrl?: string
	templates: T
}

type InferredParamPrimitive<Cfg extends TemplateParamConfig>
	= Cfg['type'] extends 'number' ? number
		: Cfg['type'] extends 'boolean' ? boolean
			: Cfg['type'] extends 'string' ? string
				: Cfg['example'] extends number ? number
					: Cfg['example'] extends boolean ? boolean
						: string

export type InferTemplateParams<Group extends DefinedTemplateGroup<any>> = {
	[K in keyof Group['templates']]: Group['templates'][K]['params'] extends Record<string, TemplateParamConfig>
		? { [P in keyof Group['templates'][K]['params']]: InferredParamPrimitive<Group['templates'][K]['params'][P]> }
		: void | undefined
}

export interface DefinedTemplateGroup<T extends Record<string, TemplateConfig>> {
	domain?: TemplateDomain
	category?: TemplateCategory
	editUrl?: string
	templates: T
	register: () => void
}

export interface CommandTemplates {}

export interface TemplateDefinition {
	id: string
	default: string
	category?: TemplateCategory
	domain?: TemplateDomain
	name?: string
	description?: string
	editUrl?: string
	params?: readonly TemplateParamDefinition[]
}

export interface RegisteredTemplate extends TemplateDefinition {
	template: string
	current: string
	isOverridden: boolean
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
		botLogger.info('[Templates] Registering: %s (%s)', definition.id, definition.category || 'command')
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
		this.overrides.clear()

		try {
			// 1. Load command template overrides
			const databaseCommandTemplates = await db.select().from(commandTemplates)
			for (const row of databaseCommandTemplates) {
				this.overrides.set(row.id, row.template)
			}

			// 2. Load general template overrides
			const databaseGeneralTemplates = await db.select().from(generalTemplates)
			for (const row of databaseGeneralTemplates) {
				this.overrides.set(row.id, row.template)
			}
		}
		catch (err) {
			botLogger.error({ err }, '[Templates] Error syncing templates with database')
		}
	}

	get(id: string): RegisteredTemplate | undefined {
		const def = this.templates.get(id)
		if (!def)
			return undefined

		const current = this.overrides.get(id) || def.default
		return {
			...def,
			template: current,
			current,
			isOverridden: this.overrides.has(id),
		}
	}

	has(id: string): boolean {
		return this.templates.has(id)
	}

	getOverrides(): Map<string, string> {
		return new Map(this.overrides)
	}

	all(): RegisteredTemplate[] {
		return Array.from(this.templates.values()).map(definition => ({
			...definition,
			template: this.overrides.get(definition.id) || definition.default,
			current: this.overrides.get(definition.id) || definition.default,
			isOverridden: this.overrides.has(definition.id),
		}))
	}

	/**
	 * Returns full catalog mapping for frontend API consumption
	 */
	getCatalog() {
		const scopes: Record<string, {
			id: string
			name: string
			domain: string
			description: string
			defaultTemplate: string
			currentTemplate: string
			isOverridden: boolean
			variables: TemplateParamDefinition[]
		}> = {}

		for (const def of this.templates.values()) {
			const current = this.overrides.get(def.id) || def.default
			scopes[def.id] = {
				id: def.id,
				name: def.name || def.id,
				domain: def.domain || (def.category === 'command' ? 'commands' : 'alerts'),
				description: def.description || '',
				defaultTemplate: def.default,
				currentTemplate: current,
				isOverridden: this.overrides.has(def.id),
				variables: def.params ? [...def.params] : [],
			}
		}

		return {
			globalVariables: GLOBAL_TEMPLATE_VARIABLES,
			scopes,
		}
	}

	async update(id: string, template: string): Promise<void> {
		const definition = this.templates.get(id)
		const category = definition?.category || (id.includes('.') && !id.startsWith('eventsub') && !id.startsWith('discord') && !id.startsWith('vault') && !id.startsWith('gambling') && !id.startsWith('ads') && !id.startsWith('widgets') ? 'command' : 'general')
		const updatedAt = new Date()

		if (category === 'command') {
			await db.insert(commandTemplates).values({ id, template, updatedAt }).onConflictDoUpdate({
				target: commandTemplates.id,
				set: { template: sql`excluded.template`, updatedAt: sql`excluded.updated_at` },
			})
		}
		else {
			await db.insert(generalTemplates).values({ id, template, updatedAt }).onConflictDoUpdate({
				target: generalTemplates.id,
				set: { template: sql`excluded.template`, updatedAt: sql`excluded.updated_at` },
			})
		}

		this.overrides.set(id, template)
	}

	async reset(id: string): Promise<string> {
		const definition = this.templates.get(id)
		if (!definition) {
			throw new Error(`Template "${id}" not found in registry`)
		}

		const category = definition.category || 'command'
		if (category === 'command') {
			await db.delete(commandTemplates).where(eq(commandTemplates.id, id))
		}
		else {
			await db.delete(generalTemplates).where(eq(generalTemplates.id, id))
		}

		this.overrides.delete(id)
		return definition.default
	}

	render(id: string, data: Record<string, string | number> = {}): string {
		const definition = this.get(id)
		if (!definition) {
			console.warn(`[Templates] Template "${id}" not found. Falling back to key/value dump.`)
			return `${id}: ${JSON.stringify(data)}`
		}

		let text = definition.template
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

		const text = definition.template
		const channel = ctx?.channel || 'streamer'
		const effectiveCtx = ctx || createTemplateContext(channel)

		return renderCustomTemplate(text, effectiveCtx, data)
	}
}

export const templateRegistry = new TemplateRegistry()

registerScopeVariablesResolver((scopeId: string) => {
	const registered = templateRegistry.get(scopeId)
	return registered?.params
})

export function defineTemplates<T extends Record<string, TemplateConfig>>(
	options: DefineTemplatesOptions<T>,
): DefinedTemplateGroup<T> {
	return {
		domain: options.domain,
		category: options.category,
		templates: options.templates,
		register() {
			for (const [id, def] of Object.entries(options.templates)) {
				const paramDefinitions: TemplateParamDefinition[] = def.params
					? Object.entries(def.params).map(([paramName, paramCfg]) => ({
							name: paramName,
							label: paramCfg.label || paramName,
							description: paramCfg.description || '',
							example: paramCfg.example ?? '',
							category: paramCfg.category,
						}))
					: []

				templateRegistry.register({
					id,
					default: def.default,
					name: def.name || id,
					description: def.description || '',
					domain: def.domain || options.domain || 'commands',
					category: def.category || options.category || 'command',
					editUrl: def.editUrl || options.editUrl,
					params: paramDefinitions,
				})
			}
		},
	}
}
