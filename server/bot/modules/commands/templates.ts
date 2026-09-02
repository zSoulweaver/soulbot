import type { MapTemplates, TemplateSourceMap } from '../../core/templates'
import { botLogger } from '~~/server/utils/logger'
import { buildTemplateParams, templateRegistry } from '../../core/templates'

const definitions = {
	'command.rename-success': {
		default: 'Command \'$(old)\' renamed to \'$(new)\'.',
		params: { old: '', new: '' } as { old: string, new: string },
		paramMeta: {
			old: { label: 'Old Trigger', description: 'The previous trigger of the renamed command.', example: '!hello' },
			new: { label: 'New Trigger', description: 'The new trigger of the renamed command.', example: '!hi' },
		},
	},
	'command.rename-not-found': {
		default: 'Command \'$(trigger)\' not found.',
		params: { trigger: '' } as { trigger: string },
		paramMeta: {
			trigger: { label: 'Command Trigger', description: 'The command trigger that could not be found.', example: '!unknown' },
		},
	},
	'command.rename-is-alias': {
		default: '\'$(trigger)\' is an alias. Use !command alias to change aliases.',
		params: { trigger: '' } as { trigger: string },
		paramMeta: {
			trigger: { label: 'Command Trigger', description: 'The command trigger name which is currently an alias.', example: '!aliasname' },
		},
	},
	'command.rename-taken': {
		default: 'Trigger \'$(trigger)\' is already in use.',
		params: { trigger: '' } as { trigger: string },
		paramMeta: {
			trigger: { label: 'Command Trigger', description: 'The trigger name which is already taken by another command.', example: '!existing' },
		},
	},
	'command.alias-success': {
		default: 'Alias \'$(name)\' set to target \'$(target)\'.',
		params: { name: '', target: '' } as { name: string, target: string },
		paramMeta: {
			name: { label: 'Alias Name', description: 'The newly created alias name.', example: '!p' },
			target: { label: 'Target Command', description: 'The target command or subcommand path that the alias redirects to.', example: '!points' },
		},
	},
	'command.alias-exists': {
		default: '\'$(name)\' is an existing command and cannot be used as an alias.',
		params: { name: '' } as { name: string },
		paramMeta: {
			name: { label: 'Command Trigger', description: 'The trigger name which already exists as a command.', example: '!points' },
		},
	},
	'command.alias-target-not-found': {
		default: 'Target command \'$(target)\' not found.',
		params: { target: '' } as { target: string },
		paramMeta: {
			target: { label: 'Target Command', description: 'The target command trigger which was not found.', example: '!nonexistent' },
		},
	},
	'command.alias-underlying-not-found': {
		default: 'Underlying command for \'$(target)\' not found.',
		params: { target: '' } as { target: string },
		paramMeta: {
			target: { label: 'Target Command', description: 'The underlying command trigger which was not found.', example: '!broken' },
		},
	},
	'command.unalias-success': {
		default: 'Alias \'$(name)\' removed.',
		params: { name: '' } as { name: string },
		paramMeta: {
			name: { label: 'Alias Name', description: 'The name of the removed alias.', example: '!p' },
		},
	},
	'command.unalias-not-found': {
		default: 'Alias \'$(name)\' not found.',
		params: { name: '' } as { name: string },
		paramMeta: {
			name: { label: 'Alias Name', description: 'The alias name that could not be found.', example: '!p' },
		},
	},
} as const satisfies TemplateSourceMap

export function registerCommandsTemplates() {
	botLogger.info('Registering command templates...')

	for (const [id, def] of Object.entries(definitions)) {
		templateRegistry.register({
			id,
			default: def.default,
			params: buildTemplateParams(def.params, (def as any).paramMeta, (def as any).paramDescriptions),
		})
	}
}

declare module '../../core/templates' {
	interface CommandTemplates extends MapTemplates<typeof definitions> {}
}
