import { eq } from 'drizzle-orm'
import { initRegistry } from '~~/server/bot'
import { templateRegistry } from '~~/server/bot/core/templates'
import { db } from '~~/server/database'
import { commandTemplates, customCommands, generalTemplates, timers, widgets } from '~~/server/database/schema'
import { updateWidgetConfig } from '~~/server/utils/widgets'
import { validateTemplate } from '~~/shared/utils/template-validator'

export interface TemplateAuditIssue {
	id: string
	domain: 'alerts' | 'discord' | 'ads' | 'vault' | 'gambling' | 'commands' | 'custom_commands' | 'timers' | 'widgets' | string
	location: string
	scopeId?: string
	field?: string
	targetId?: string
	currentTemplate: string
	defaultTemplate?: string
	canReset: boolean
	isOrphan?: boolean
	editUrl?: string
	invalidVariables: Array<{
		raw: string
		name: string
		type: string
		reason?: string
		suggestions: string[]
	}>
}

export interface TemplateAuditResult {
	totalIssues: number
	hasIssues: boolean
	issues: TemplateAuditIssue[]
}

/**
 * Audits all stored templates across database overrides, custom commands, timers,
 * and widgets for invalid or outdated template variables.
 * Uses templateRegistry as the single source of truth for definitions, default templates,
 * allowed variables, and edit navigation URLs.
 */
export async function auditStoredTemplates(): Promise<TemplateAuditResult> {
	initRegistry()
	await templateRegistry.syncWithDb()

	const issues: TemplateAuditIssue[] = []

	// 1. Registered Template Overrides in templateRegistry (from command_templates, general_templates, and settings)
	for (const def of templateRegistry.all()) {
		if (!def.isOverridden)
			continue

		const allowedVars = def.params ? [...def.params] : []
		const validation = validateTemplate(def.template, {
			scopeId: def.id,
			allowedVariables: allowedVars,
			includeGlobal: true,
		})

		if (!validation.isValid) {
			const isCommand = def.category === 'command' || (!def.domain && !def.id.startsWith('eventsub') && !def.id.startsWith('discord') && !def.id.startsWith('ads') && !def.id.startsWith('widgets') && !def.id.startsWith('vault') && !def.id.startsWith('gambling'))
			const domain = (def.domain || (isCommand ? 'commands' : (def.id.split('.')[0] || 'alerts'))) as TemplateAuditIssue['domain']
			issues.push({
				id: `${domain}:${def.id}`,
				domain,
				location: def.name || (isCommand ? `Command: !${def.id}` : `Template: ${def.id}`),
				targetId: def.id,
				scopeId: def.id,
				currentTemplate: def.template,
				defaultTemplate: def.default,
				canReset: true,
				isOrphan: false,
				editUrl: def.editUrl,
				invalidVariables: validation.invalidVariables.map(v => ({
					raw: v.raw,
					name: v.name,
					type: v.type,
					reason: v.reason,
					suggestions: v.suggestions,
				})),
			})
		}
	}

	// 1b. Orphaned template overrides stored in command_templates or general_templates not registered in any bot module
	const dbCommandTemplates = await db.select().from(commandTemplates)
	const dbGeneralTemplates = await db.select().from(generalTemplates)

	for (const item of dbCommandTemplates) {
		if (!templateRegistry.has(item.id)) {
			issues.push({
				id: `commands:${item.id}`,
				domain: 'commands',
				location: `Orphaned Command: !${item.id}`,
				targetId: item.id,
				scopeId: item.id,
				currentTemplate: item.template,
				defaultTemplate: undefined,
				canReset: true,
				isOrphan: true,
				editUrl: undefined,
				invalidVariables: [
					{
						raw: item.id,
						name: item.id,
						type: 'orphan',
						reason: 'This template is orphaned in the database and is no longer used by any bot feature or module.',
						suggestions: [],
					},
				],
			})
		}
	}

	for (const item of dbGeneralTemplates) {
		if (!templateRegistry.has(item.id)) {
			const domain = (item.id.split('.')[0] || 'alerts') as TemplateAuditIssue['domain']
			issues.push({
				id: `${domain}:${item.id}`,
				domain,
				location: `Orphaned Template: ${item.id}`,
				targetId: item.id,
				scopeId: item.id,
				currentTemplate: item.template,
				defaultTemplate: undefined,
				canReset: true,
				isOrphan: true,
				editUrl: undefined,
				invalidVariables: [
					{
						raw: item.id,
						name: item.id,
						type: 'orphan',
						reason: 'This template is orphaned in the database and is no longer used by any bot feature or module.',
						suggestions: [],
					},
				],
			})
		}
	}

	// 2. Custom Commands (from custom_commands table)
	const dbCustomCommands = await db.select().from(customCommands)
	for (const cmd of dbCustomCommands) {
		const validation = validateTemplate(cmd.response, {
			scopeId: 'commands.custom',
		})

		if (!validation.isValid) {
			issues.push({
				id: `custom_commands:${cmd.id}`,
				domain: 'custom_commands',
				location: `Custom Command: !${cmd.trigger}`,
				targetId: cmd.id,
				currentTemplate: cmd.response,
				canReset: false,
				editUrl: templateRegistry.get('commands.custom')?.editUrl || '/admin/commands/custom',
				invalidVariables: validation.invalidVariables.map(v => ({
					raw: v.raw,
					name: v.name,
					type: v.type,
					reason: v.reason,
					suggestions: v.suggestions,
				})),
			})
		}
	}

	// 3. Timers (from timers table)
	const dbTimers = await db.select().from(timers)
	for (const timer of dbTimers) {
		if (Array.isArray(timer.messages)) {
			for (let i = 0; i < timer.messages.length; i++) {
				const msg = timer.messages[i]
				if (!msg || !msg.text)
					continue

				const validation = validateTemplate(msg.text, {
					scopeId: 'timers.message',
				})

				if (!validation.isValid) {
					issues.push({
						id: `timers:${timer.id}:${i}`,
						domain: 'timers',
						location: `Timer: ${timer.name} (Message #${i + 1})`,
						targetId: timer.id,
						currentTemplate: msg.text,
						canReset: false,
						editUrl: templateRegistry.get('timers.message')?.editUrl || '/admin/timers',
						invalidVariables: validation.invalidVariables.map(v => ({
							raw: v.raw,
							name: v.name,
							type: v.type,
							reason: v.reason,
							suggestions: v.suggestions,
						})),
					})
				}
			}
		}
	}

	// 4. Widgets (from widgets table)
	const dbWidgets = await db.select().from(widgets)
	for (const widget of dbWidgets) {
		const scopeId = `widgets.${widget.id}`
		const scopeDef = templateRegistry.get(scopeId)
		const validation = validateTemplate(widget.template, {
			scopeId: scopeDef ? scopeId : undefined,
		})

		if (!validation.isValid) {
			issues.push({
				id: `widgets:${widget.id}`,
				domain: 'widgets',
				location: `Widget: ${widget.name}`,
				targetId: widget.id,
				currentTemplate: widget.template,
				defaultTemplate: scopeDef?.default,
				canReset: !!scopeDef,
				editUrl: scopeDef?.editUrl || '/admin/widgets/deaths',
				invalidVariables: validation.invalidVariables.map(v => ({
					raw: v.raw,
					name: v.name,
					type: v.type,
					reason: v.reason,
					suggestions: v.suggestions,
				})),
			})
		}
	}

	return {
		totalIssues: issues.length,
		hasIssues: issues.length > 0,
		issues,
	}
}

/**
 * Resets a broken template back to its default definition using templateRegistry
 * as the single source of truth.
 */
export async function resetStoredTemplate(payload: {
	id?: string
	domain?: string
	field?: string
	targetId?: string
}): Promise<{ success: boolean, defaultTemplate: string }> {
	const rawId = payload.id || ''
	const domainName = payload.domain || rawId.split(':')[0] || ''
	let targetId = payload.targetId || payload.field || (rawId.includes(':') ? rawId.split(':').slice(1).join(':') : rawId)

	if (!targetId && domainName === 'ads') {
		targetId = 'ads.alert'
	}

	if (domainName === 'custom_commands' || domainName === 'timers' || rawId.startsWith('custom_commands:') || rawId.startsWith('timers:')) {
		throw new Error(`Reset not supported for ${domainName || 'this domain'}`)
	}

	// 1. Registered Template in registry (command or general)
	if (targetId && templateRegistry.has(targetId)) {
		const defaultTemplate = await templateRegistry.reset(targetId)
		return { success: true, defaultTemplate }
	}

	// 2. Widgets reset
	if (domainName === 'widgets' && targetId) {
		const scopeDef = templateRegistry.get(`widgets.${targetId}`)
		if (!scopeDef) {
			throw new Error(`Widget scope definition not found for "${targetId}"`)
		}
		await updateWidgetConfig(targetId, { template: scopeDef.default })
		return { success: true, defaultTemplate: scopeDef.default }
	}

	// 3. Orphan database override (legacy/deleted template) - delete from DB
	if (targetId) {
		await db.delete(generalTemplates).where(eq(generalTemplates.id, targetId))
		await db.delete(commandTemplates).where(eq(commandTemplates.id, targetId))
		return { success: true, defaultTemplate: '' }
	}

	throw new Error(`Reset not supported for target "${targetId || rawId}"`)
}
