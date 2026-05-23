import type { MapTemplates, TemplateSourceMap } from '../../core/templates'
import { botLogger } from '~~/server/utils/logger'
import { templateRegistry } from '../../core/templates'

const definitions = {
	'command.rename-success': {
		default: 'Command \'${old}\' renamed to \'${new}\'.',
		params: { old: '', new: '' } as { old: string, new: string },
	},
	'command.rename-not-found': {
		default: 'Command \'${trigger}\' not found.',
		params: { trigger: '' } as { trigger: string },
	},
	'command.rename-is-alias': {
		default: '\'${trigger}\' is an alias. Use !command alias to change aliases.',
		params: { trigger: '' } as { trigger: string },
	},
	'command.rename-taken': {
		default: 'Trigger \'${trigger}\' is already in use.',
		params: { trigger: '' } as { trigger: string },
	},
	'command.alias-success': {
		default: 'Alias \'${name}\' set to target \'${target}\'.',
		params: { name: '', target: '' } as { name: string, target: string },
	},
	'command.alias-exists': {
		default: '\'${name}\' is an existing command and cannot be used as an alias.',
		params: { name: '' } as { name: string },
	},
	'command.alias-target-not-found': {
		default: 'Target command \'${target}\' not found.',
		params: { target: '' } as { target: string },
	},
	'command.alias-underlying-not-found': {
		default: 'Underlying command for \'${target}\' not found.',
		params: { target: '' } as { target: string },
	},
	'command.unalias-success': {
		default: 'Alias \'${name}\' removed.',
		params: { name: '' } as { name: string },
	},
	'command.unalias-not-found': {
		default: 'Alias \'${name}\' not found.',
		params: { name: '' } as { name: string },
	},
} as const satisfies TemplateSourceMap

export function registerCommandsTemplates() {
	botLogger.info('Registering command templates...')

	for (const [id, def] of Object.entries(definitions)) {
		templateRegistry.register({
			id,
			default: def.default,
			params: def.params ? Object.keys(def.params) : [],
		})
	}
}

declare module '../../core/templates' {
	interface CommandTemplates extends MapTemplates<typeof definitions> {}
}
