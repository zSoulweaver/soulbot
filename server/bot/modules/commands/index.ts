import { defineCommand } from '../../core/define-command'
import { handleAlias } from './handlers/alias'
import { handleRename } from './handlers/rename'
import { handleUnalias } from './handlers/unalias'
import { AliasArgs, RenameArgs, UnaliasArgs } from './schema'
import { registerCommandsTemplates } from './templates'

registerCommandsTemplates()

export const commandsModule = defineCommand({
	id: 'command',
	description: 'Manage bot commands',
	permission: 'broadcaster',
	handler: () => {},
	subcommands: {
		rename: {
			description: 'Rename a root command',
			usage: '!command rename <old> <new>',
			permission: 'broadcaster',
			args: RenameArgs,
			handler: handleRename,
		},
		alias: {
			description: 'Create or update a command alias',
			usage: '!command alias <name> <target...>',
			permission: 'broadcaster',
			args: AliasArgs,
			handler: handleAlias,
		},
		unalias: {
			description: 'Remove a command alias',
			usage: '!command unalias <name>',
			permission: 'broadcaster',
			args: UnaliasArgs,
			handler: handleUnalias,
		},
	},
})
