import { defineCommand } from '../../core/define-command'
import { handlePointsAdd } from './handlers/add'
import { handlePointsRoot } from './handlers/root'
import { PointsAddArgs, PointsArgs } from './schema'
import { registerPointsTemplates } from './templates'

registerPointsTemplates()

export const pointsCommand = defineCommand({
	id: 'points',
	description: 'Manage and check points',
	usage: '!points [user]',
	permission: 'everyone',
	args: PointsArgs,
	handler: handlePointsRoot,
	subcommands: {
		add: {
			description: 'Add points to a user',
			usage: '!points add <user> <amount>',
			permission: 'moderator',
			args: PointsAddArgs,
			handler: handlePointsAdd,
		},
	},
})
