import type { MapTemplates, TemplateSourceMap } from '../../core/templates'
import { botLogger } from '~~/server/utils/logger'
import { templateRegistry } from '../../core/templates'

const definitions = {
	'command.rename-success': {
		default: 'Command \'$(old)\' renamed to \'$(new)\'.',
		params: { old: '', new: '' } as { old: string, new: string },
		paramDescriptions: {
			old: 'The previous trigger of the renamed command.',
			new: 'The new trigger of the renamed command.',
		},
	},
	'command.rename-not-found': {
		default: 'Command \'$(trigger)\' not found.',
		params: { trigger: '' } as { trigger: string },
		paramDescriptions: {
			trigger: 'The command trigger that could not be found.',
		},
	},
	'command.rename-is-alias': {
		default: '\'$(trigger)\' is an alias. Use !command alias to change aliases.',
		params: { trigger: '' } as { trigger: string },
		paramDescriptions: {
			trigger: 'The command trigger name which is currently an alias.',
		},
	},
	'command.rename-taken': {
		default: 'Trigger \'$(trigger)\' is already in use.',
		params: { trigger: '' } as { trigger: string },
		paramDescriptions: {
			trigger: 'The trigger name which is already taken by another command.',
		},
	},
	'command.alias-success': {
		default: 'Alias \'$(name)\' set to target \'$(target)\'.',
		params: { name: '', target: '' } as { name: string, target: string },
		paramDescriptions: {
			name: 'The newly created alias name.',
			target: 'The target command or subcommand path that the alias redirects to.',
		},
	},
	'command.alias-exists': {
		default: '\'$(name)\' is an existing command and cannot be used as an alias.',
		params: { name: '' } as { name: string },
		paramDescriptions: {
			name: 'The trigger name which already exists as a command.',
		},
	},
	'command.alias-target-not-found': {
		default: 'Target command \'$(target)\' not found.',
		params: { target: '' } as { target: string },
		paramDescriptions: {
			target: 'The target command trigger which was not found.',
		},
	},
	'command.alias-underlying-not-found': {
		default: 'Underlying command for \'$(target)\' not found.',
		params: { target: '' } as { target: string },
		paramDescriptions: {
			target: 'The underlying command trigger which was not found.',
		},
	},
	'command.unalias-success': {
		default: 'Alias \'$(name)\' removed.',
		params: { name: '' } as { name: string },
		paramDescriptions: {
			name: 'The name of the removed alias.',
		},
	},
	'command.unalias-not-found': {
		default: 'Alias \'$(name)\' not found.',
		params: { name: '' } as { name: string },
		paramDescriptions: {
			name: 'The alias name that could not be found.',
		},
	},
} as const satisfies TemplateSourceMap

export function registerCommandsTemplates() {
	botLogger.info('Registering command templates...')

	for (const [id, def] of Object.entries(definitions)) {
		const paramDescriptions = (def as any).paramDescriptions || {}
		templateRegistry.register({
			id,
			default: def.default,
			params: def.params
				? Object.keys(def.params).map(key => ({
						name: key,
						description: paramDescriptions[key] || '',
					}))
				: [],
		})
	}
}

declare module '../../core/templates' {
	interface CommandTemplates extends MapTemplates<typeof definitions> {}
}
