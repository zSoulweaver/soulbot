import { botEventBus } from '~~/server/bot/core/events'
import { botLogger } from '~~/server/utils/logger'
import { defineCommand } from '../../core/define-command'
import { handleDeathsAdd } from './handlers/add'
import { handleDeathsList } from './handlers/list'
import { handleDeathsRemove } from './handlers/remove'
import { handleDeathsRename } from './handlers/rename'
import { handleDeathsReset } from './handlers/reset'
import { handleDeathsRoot } from './handlers/root'
import { handleDeathsSelect } from './handlers/select'
import { handleDeathsSet } from './handlers/set'
import {
	DeathsAmountArgs,
	DeathsRenameArgs,
	DeathsResetArgs,
	DeathsSelectArgs,
	DeathsSetArgs,
} from './schema'
import { registerDeathsTemplates } from './templates'
import { clearDeathsCache, syncAllGameDeathsMetadata } from './utils'

registerDeathsTemplates()

// Run async metadata sync in background without blocking module initialization
syncAllGameDeathsMetadata()
	.then((updatedCount) => {
		if (updatedCount > 0) {
			botLogger.info({ updatedCount }, '[Deaths] Startup game metadata sync completed')
		}
	})
	.catch((err) => {
		botLogger.error({ err }, '[Deaths] Startup game metadata sync failed')
	})

// Invalidate cached public deaths leaderboard when a death counter is updated
botEventBus.on('deaths:updated', () => {
	clearDeathsCache()
})

export const deathsModule = defineCommand({
	id: 'deaths',
	description: 'Track and check game death counters',
	usage: '!deaths',
	permission: 'everyone',
	handler: handleDeathsRoot,
	templates: [
		'deaths.show',
		'deaths.counter-not-found',
		'deaths.no-game',
	],
	subcommands: {
		add: {
			description: 'Add to the death count for the active (or specified) counter',
			usage: '!deaths add [amount] [counter]',
			permission: 'moderator',
			args: DeathsAmountArgs,
			handler: handleDeathsAdd,
			templates: [
				'deaths.add',
			],
		},
		remove: {
			description: 'Remove from the death count for the active (or specified) counter',
			usage: '!deaths remove [amount] [counter]',
			permission: 'moderator',
			args: DeathsAmountArgs,
			handler: handleDeathsRemove,
			templates: [
				'deaths.remove',
				'deaths.counter-not-found',
			],
		},
		set: {
			description: 'Set death count for the active (or specified) counter to a specific number',
			usage: '!deaths set <count> [counter]',
			permission: 'moderator',
			args: DeathsSetArgs,
			handler: handleDeathsSet,
			templates: [
				'deaths.set',
			],
		},
		reset: {
			description: 'Reset death count for the active (or specified) counter to 0',
			usage: '!deaths reset [counter]',
			permission: 'moderator',
			args: DeathsResetArgs,
			handler: handleDeathsReset,
			templates: [
				'deaths.reset',
				'deaths.counter-not-found',
			],
		},
		select: {
			description: 'Switch active death counter for the current game',
			usage: '!deaths select <counter name>',
			permission: 'moderator',
			args: DeathsSelectArgs,
			handler: handleDeathsSelect,
			templates: [
				'deaths.select',
			],
		},
		list: {
			description: 'List all death counters for the current game',
			usage: '!deaths list',
			permission: 'moderator',
			handler: handleDeathsList,
			templates: [
				'deaths.list',
			],
		},
		rename: {
			description: 'Rename a playthrough counter for the current game',
			usage: '!deaths rename <old name> to <new name>',
			permission: 'moderator',
			args: DeathsRenameArgs,
			handler: handleDeathsRename,
			templates: [
				'deaths.rename',
				'deaths.counter-not-found',
			],
		},
	},
})
