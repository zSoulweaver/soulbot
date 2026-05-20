import { defineCommand } from '../../core/define-command'
import { handlePointsAdd } from './handlers/add'
import { handlePointsGetTop } from './handlers/get-top'
import { handlePointsRoot } from './handlers/root'
import { PointsAddArgs, PointsArgs, PointsGetTopArgs } from './schema'
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
		get: {
			description: 'Get points metrics or details',
			permission: 'everyone',
			subcommands: {
				top: {
					description: 'Show top point leaders',
					usage: '!points get top [count]',
					permission: 'everyone',
					args: PointsGetTopArgs,
					handler: handlePointsGetTop,
					templates: [
						'points.get-top',
						'points.get-top-empty',
					],
				},
			},
		},
	},
})
