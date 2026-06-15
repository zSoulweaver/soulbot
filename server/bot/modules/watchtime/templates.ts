import type { TemplateSourceMap } from '../../core/templates'
import { botLogger } from '~~/server/utils/logger'
import { templateRegistry } from '../../core/templates'

export const definitions = {
	'watchtime.show': {
		default: '$(target) has spent $(time) hanging out in chat and is rank #$(rank) on the leaderboard.',
		params: { target: '', time: '', rank: 0 } as { target: string, time: string, rank: number },
	},
	'watchtime.show-self': {
		default: 'you have spent $(time) hanging out in chat and are rank #$(rank) on the leaderboard.',
		params: { time: '', rank: 0 } as { time: string, rank: number },
	},
	'watchtime.user-no-time': {
		default: '$(target) hasn\'t accumulated any watch time yet.',
		params: { target: '' } as { target: string },
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
			params: def.params ? Object.keys(def.params) : [],
		})
	}
}

declare module '../../core/templates' {
	interface CommandTemplates extends MapTemplates<typeof definitions> {}
}
