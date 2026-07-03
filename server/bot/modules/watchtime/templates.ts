import type { TemplateSourceMap } from '../../core/templates'
import { botLogger } from '~~/server/utils/logger'
import { templateRegistry } from '../../core/templates'

export const definitions = {
	'watchtime.show': {
		default: '$(target) has spent $(time) hanging out in chat and is rank #$(rank) on the leaderboard.',
		params: { target: '', time: '', rank: 0 } as { target: string, time: string, rank: number },
		paramDescriptions: {
			target: 'The Twitch username of the user.',
			time: 'The formatted watch time duration (e.g. "2 hours, 15 minutes").',
			rank: 'The user\'s rank on the watch time leaderboard.',
		},
	},
	'watchtime.show-self': {
		default: 'you have spent $(time) hanging out in chat and are rank #$(rank) on the leaderboard.',
		params: { time: '', rank: 0 } as { time: string, rank: number },
		paramDescriptions: {
			time: 'Your formatted watch time duration.',
			rank: 'Your rank on the watch time leaderboard.',
		},
	},
	'watchtime.user-no-time': {
		default: '$(target) hasn\'t accumulated any watch time yet.',
		params: { target: '' } as { target: string },
		paramDescriptions: {
			target: 'The Twitch username of the user.',
		},
	},
	'watchtime.user-no-time-self': {
		default: 'you haven\'t accumulated any watch time yet.',
		params: undefined,
	},
} as const satisfies TemplateSourceMap

export function registerWatchTimeTemplates() {
	botLogger.info('Registering watch time templates...')

	for (const [id, def] of Object.entries(definitions)) {
		const paramDescriptions = (def as any).paramDescriptions || {}
		templateRegistry.register({
			id,
			default: def.default,
			params: def.params
				? Object.keys(def.params).map(key => ({
						name: key,
						description: paramDescriptions[key] || '',
					}))
				: [],
		})
	}
}

declare module '../../core/templates' {
	interface CommandTemplates extends MapTemplates<typeof definitions> {}
}
