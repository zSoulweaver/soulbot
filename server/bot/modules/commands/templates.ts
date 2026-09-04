import type { InferTemplateParams } from '../../core/templates'
import { botLogger } from '~~/server/utils/logger'
import { defineTemplates } from '../../core/templates'

export const commandTemplatesDefinitions = defineTemplates({
	domain: 'commands',
	category: 'command',
	editUrl: '/admin/commands/core',
	templates: {
		'command.rename-success': {
			default: 'Command \'$(old)\' renamed to \'$(new)\'.',
			params: {
				old: { label: 'Old Trigger', description: 'The previous trigger of the renamed command.', example: '!hello' },
				new: { label: 'New Trigger', description: 'The new trigger of the renamed command.', example: '!hi' },
			},
		},
		'command.rename-not-found': {
			default: 'Command \'$(trigger)\' not found.',
			params: {
				trigger: { label: 'Command Trigger', description: 'The command trigger that could not be found.', example: '!unknown' },
			},
		},
		'command.rename-is-alias': {
			default: '\'$(trigger)\' is an alias. Use !command alias to change aliases.',
			params: {
				trigger: { label: 'Command Trigger', description: 'The command trigger name which is currently an alias.', example: '!aliasname' },
			},
		},
		'command.rename-taken': {
			default: 'Trigger \'$(trigger)\' is already in use.',
			params: {
				trigger: { label: 'Command Trigger', description: 'The trigger name which is already taken by another command.', example: '!existing' },
			},
		},
		'command.alias-success': {
			default: 'Alias \'$(name)\' set to target \'$(target)\'.',
			params: {
				name: { label: 'Alias Name', description: 'The newly created alias name.', example: '!p' },
				target: { label: 'Target Command', description: 'The target command or subcommand path that the alias redirects to.', example: '!points' },
			},
		},
		'command.alias-exists': {
			default: '\'$(name)\' is an existing command and cannot be used as an alias.',
			params: {
				name: { label: 'Command Trigger', description: 'The trigger name which already exists as a command.', example: '!points' },
			},
		},
		'command.alias-target-not-found': {
			default: 'Target command \'$(target)\' not found.',
			params: {
				target: { label: 'Target Command', description: 'The target command trigger which was not found.', example: '!nonexistent' },
			},
		},
		'command.alias-underlying-not-found': {
			default: 'Underlying command for \'$(target)\' not found.',
			params: {
				target: { label: 'Target Command', description: 'The underlying command trigger which was not found.', example: '!broken' },
			},
		},
		'command.unalias-success': {
			default: 'Alias \'$(name)\' removed.',
			params: {
				name: { label: 'Alias Name', description: 'The name of the removed alias.', example: '!p' },
			},
		},
		'command.unalias-not-found': {
			default: 'Alias \'$(name)\' not found.',
			params: {
				name: { label: 'Alias Name', description: 'The alias name that could not be found.', example: '!p' },
			},
		},
		'commands.custom': {
			name: 'Custom Chat Command',
			category: 'general',
			editUrl: '/admin/commands/custom',
			description: 'Custom command chat response template with positional arguments and counter variables.',
			default: '$(sender), you have $(points) $(core.currency)!',
			params: {
				'sender': { label: 'Command Sender', description: 'Display name of the user who executed the command.', example: 'ViewerOne' },
				'sender.name': { label: 'Sender Username', description: 'Lowercase username of the command sender.', example: 'viewerone' },
				'sender.id': { label: 'Sender User ID', description: 'Twitch user ID of the command sender.', example: '12345678' },
				'touser': { label: 'Target User', description: 'Target user specified in command arguments (or sender if none).', example: 'FriendUser' },
				'query': { label: 'Full Query Arguments', description: 'All arguments passed after the command as a single string.', example: 'hello world' },
				'1': { label: 'Argument 1', description: 'First positional argument passed to the command.', example: 'arg1' },
				'2': { label: 'Argument 2', description: 'Second positional argument passed to the command.', example: 'arg2' },
				'count': { label: 'Persistent Counter', description: 'Increments and outputs a database counter ($(count) or $(count <name>)).', example: 1 },
			},
		},
	},
})

export function registerCommandsTemplates() {
	botLogger.info('Registering command templates...')
	commandTemplatesDefinitions.register()
}

declare module '../../core/templates' {
	interface CommandTemplates extends InferTemplateParams<typeof commandTemplatesDefinitions> {}
}
