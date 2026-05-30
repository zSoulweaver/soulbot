import { defineCommandVariable } from '../define-command-variable'

/**
 * Sender variable resolver: $(sender), $(user), $(user.name), $(user.id)
 */
export const senderVariable = defineCommandVariable({
	name: 'sender',
	aliases: ['user'],
	description: 'Resolves metadata about the user who triggered the command.',
	examples: [
		{ syntax: '$(sender)', description: 'Display name of the sender.' },
		{ syntax: '$(sender.name)', description: 'Lower-case login username of the sender.' },
		{ syntax: '$(sender.id)', description: 'Unique Twitch account ID of the sender.' },
	],
	resolve: (args, ctx) => {
		const field = args[0]?.toLowerCase()

		if (field === 'name') {
			return ctx.user.name
		}
		if (field === 'id') {
			return ctx.user.id
		}

		// Default to display name
		return ctx.user.displayName
	},
})
