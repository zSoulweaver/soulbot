import { defineCommand } from '../../core/define-command'
import { handleDeathsAdd } from './handlers/add'
import { handleDeathsRemove } from './handlers/remove'
import { handleDeathsReset } from './handlers/reset'
import { handleDeathsRoot } from './handlers/root'
import { handleDeathsSet } from './handlers/set'
import { DeathsAmountArgs, DeathsSetArgs } from './schema'
import { registerDeathsTemplates } from './templates'

registerDeathsTemplates()

export const deathsModule = defineCommand({
	id: 'deaths',
	description: 'Track and check game death counter',
	usage: '!deaths',
	permission: 'everyone',
	handler: handleDeathsRoot,
	templates: [
		'deaths.show',
		'deaths.no-game',
	],
	subcommands: {
		add: {
			description: 'Add to the death count for the current game',
			usage: '!deaths add [amount]',
			permission: 'moderator',
			args: DeathsAmountArgs,
			handler: handleDeathsAdd,
			templates: [
				'deaths.add',
			],
		},
		remove: {
			description: 'Remove from the death count for the current game',
			usage: '!deaths remove [amount]',
			permission: 'moderator',
			args: DeathsAmountArgs,
			handler: handleDeathsRemove,
			templates: [
				'deaths.remove',
			],
		},
		set: {
			description: 'Set death count for the current game to a specific number',
			usage: '!deaths set <number>',
			permission: 'moderator',
			args: DeathsSetArgs,
			handler: handleDeathsSet,
			templates: [
				'deaths.set',
			],
		},
		reset: {
			description: 'Reset death count for the current game to 0',
			usage: '!deaths reset',
			permission: 'moderator',
			handler: handleDeathsReset,
			templates: [
				'deaths.reset',
			],
		},
	},
})
