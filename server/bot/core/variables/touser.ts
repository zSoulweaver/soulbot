import { defineCommandVariable } from '../define-command-variable'

/**
 * Target user variable resolver: $(touser), $(target)
 */
export const touserVariable = defineCommandVariable({
	name: 'touser',
	aliases: ['target'],
	description: 'Resolves to the first argument target user (stripped of @); defaults to the sender display name if empty.',
	examples: [
		{ syntax: '$(touser)', description: 'First argument target user (stripped of @); defaults to the sender display name if empty.' },
	],
	resolve: (_args, ctx) => {
		const targetArg = ctx.rawArgs[0]
		if (targetArg) {
			// Strip leading @ character if present in user input (e.g. @zsoulweaver -> zsoulweaver)
			return targetArg.startsWith('@') ? targetArg.slice(1) : targetArg
		}
		// Fallback to sender's display name if no argument was provided
		return ctx.user.displayName
	},
})
