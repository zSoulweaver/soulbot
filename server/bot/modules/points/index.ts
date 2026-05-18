import { defineCommand } from '../../core/define-command'
import { handlePointsAdd } from './handlers/add'
import { handlePointsRoot } from './handlers/root'
import { PointsAddArgs, PointsArgs } from './schema'
import { registerPointsTemplates } from './templates'

registerPointsTemplates()

export const pointsModule = defineCommand({
	id: 'points',
	description: 'Manage and check points',
	usage: '!points [user]',
	permission: 'everyone',
	args: PointsArgs,
	handler: handlePointsRoot,
	templates: [
		'points.show',
		'points.show-self',
		'points.user-no-points',
		'points.user-no-points-self',
	],
	subcommands: {
		add: {
			description: 'Add points to a user',
			usage: '!points add <user> <amount>',
			permission: 'moderator',
			args: PointsAddArgs,
			handler: handlePointsAdd,
			templates: [
				'points.add',
				'points.user-does-not-exist',
			],
		},
	},
})
