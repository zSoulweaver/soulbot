import { defineCommandVariable } from '../define-command-variable'

/**
 * Query variable resolver: $(query), $(args)
 */
export const queryVariable = defineCommandVariable({
	name: 'query',
	aliases: ['args'],
	description: 'Resolves to the complete arguments query string typed after the command name.',
	examples: [
		{ syntax: '$(query)', description: 'The complete arguments query string typed after the command.' },
	],
	resolve: (_args, ctx) => {
		return ctx.rawArgs.join(' ')
	},
})
