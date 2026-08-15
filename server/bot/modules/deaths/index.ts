import { botEventBus } from '~~/server/bot/core/events'
import { botLogger } from '~~/server/utils/logger'
import { defineCommand } from '../../core/define-command'
import { handleDeathsAdd } from './handlers/add'
import { handleDeathsRemove } from './handlers/remove'
import { handleDeathsReset } from './handlers/reset'
import { handleDeathsRoot } from './handlers/root'
import { handleDeathsSet } from './handlers/set'
import { DeathsAmountArgs, DeathsSetArgs } from './schema'
import { registerDeathsTemplates } from './templates'
import { cleanupZeroDeathsRecords, clearDeathsCache, syncAllGameDeathsMetadata } from './utils'

registerDeathsTemplates()

// Clean up zero-death records on module initialization
cleanupZeroDeathsRecords()
	.then((deletedCount) => {
		if (deletedCount > 0) {
			botLogger.info({ deletedCount }, '[Deaths] Cleaned up zero-death records on startup')
		}
	})
	.catch((err) => {
		botLogger.error({ err }, '[Deaths] Error cleaning up zero-death records on startup')
	})

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
