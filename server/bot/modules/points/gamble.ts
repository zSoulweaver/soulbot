import { defineCommand } from '../../core/define-command'
import { handleGambleBonus } from './handlers/gamble/bonus'
import { handleGambleRoot } from './handlers/gamble/root'
import { handleGambleStats } from './handlers/gamble/stats'
import { GambleArgs, GambleStatsArgs } from './schema'

export const gambleModule = defineCommand({
	id: 'gamble',
	description: 'Gamble your points',
	usage: '!gamble <amount|all|half>',
	permission: 'everyone',
	args: GambleArgs,
	templates: [
		'points.gambling.win',
		'points.gambling.lose',
		'points.gambling.min-bet',
		'points.gambling.max-bet',
		'points.gambling.not-enough-points',
		'points.gambling.invalid-amount',
		'points.user-no-points-self',
		'points.gambling.stats',
		'points.gambling.stats-self',
		'points.user-not-found',
	],
	handler: handleGambleRoot,
	subcommands: {
		stats: {
			description: 'Show gambling win/loss statistics',
			usage: '!gamble stats [user]',
			permission: 'everyone',
			args: GambleStatsArgs,
			handler: handleGambleStats,
			templates: [
				'points.gambling.stats',
				'points.gambling.stats-self',
				'points.user-not-found',
				'points.user-no-points-self',
			],
		},
		bonus: {
			description: 'Trigger a limited-time gamble bonus event',
			usage: '!gamble bonus',
			permission: 'moderator',
			handler: handleGambleBonus,
		},
	},
})
