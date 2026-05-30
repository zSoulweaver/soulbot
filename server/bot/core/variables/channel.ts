import { defineCommandVariable } from '../define-command-variable'

/**
 * Channel variable resolver: $(channel)
 */
export const channelVariable = defineCommandVariable({
	name: 'channel',
	description: 'Resolves the name of the streamer\'s Twitch channel.',
	examples: [
		{ syntax: '$(channel)', description: 'Twitch stream channel name (cleansed of leading #).' },
	],
	resolve: (_args, ctx) => {
		// Strip leading hash symbol if it exists in Twitch channel name
		return ctx.channel.startsWith('#') ? ctx.channel.slice(1) : ctx.channel
	},
})
