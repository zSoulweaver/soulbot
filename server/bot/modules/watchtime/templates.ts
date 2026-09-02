import type { MapTemplates, TemplateSourceMap } from '../../core/templates'
import { botLogger } from '~~/server/utils/logger'
import { buildTemplateParams, templateRegistry } from '../../core/templates'

export const definitions = {
	'watchtime.show': {
		default: '$(target) has spent $(time) hanging out in chat and is rank #$(rank) on the leaderboard.',
		params: { target: '', time: '', rank: 0 } as { target: string, time: string, rank: number },
		paramMeta: {
			target: { label: 'Target User', description: 'The Twitch username of the user.', example: 'CoolFella123' },
			time: { label: 'Watch Time', description: 'The formatted watch time duration (e.g. "2 hours, 15 minutes").', example: '2 hours, 15 minutes' },
			rank: { label: 'Leaderboard Rank', description: 'The user\'s rank on the watch time leaderboard.', example: 3 },
		},
	},
	'watchtime.show-self': {
		default: 'you have spent $(time) hanging out in chat and are rank #$(rank) on the leaderboard.',
		params: { time: '', rank: 0 } as { time: string, rank: number },
		paramMeta: {
			time: { label: 'Watch Time', description: 'Your formatted watch time duration.', example: '2 hours, 15 minutes' },
			rank: { label: 'Leaderboard Rank', description: 'Your rank on the watch time leaderboard.', example: 3 },
		},
	},
	'watchtime.user-no-time': {
		default: '$(target) hasn\'t accumulated any watch time yet.',
		params: { target: '' } as { target: string },
		paramMeta: {
			target: { label: 'Target User', description: 'The Twitch username of the user.', example: 'CoolFella123' },
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
		templateRegistry.register({
			id,
			default: def.default,
			params: buildTemplateParams(def.params, (def as any).paramMeta, (def as any).paramDescriptions),
		})
	}
}

declare module '../../core/templates' {
	interface CommandTemplates extends MapTemplates<typeof definitions> {}
}
