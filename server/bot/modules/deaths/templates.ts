import type { MapTemplates, TemplateSourceMap } from '../../core/templates'
import { botLogger } from '~~/server/utils/logger'
import { templateRegistry } from '../../core/templates'

const definitions = {
	'deaths.show': {
		default: '$(streamer) has died $(count) times in $(game).',
		params: { streamer: '', game: '', count: 0 } as { streamer: string, game: string, count: number },
		paramDescriptions: {
			streamer: 'The display name or username of the streamer.',
			game: 'The name of the currently playing game.',
			count: 'The current death count for this game.',
		},
	},
	'deaths.add': {
		default: 'Added $(amount) death(s)! Total deaths for $(game): $(count).',
		params: { amount: 1, game: '', count: 0 } as { amount: number, game: string, count: number },
		paramDescriptions: {
			amount: 'The number of deaths added.',
			game: 'The name of the currently playing game.',
			count: 'The updated total death count for this game.',
		},
	},
	'deaths.remove': {
		default: 'Removed $(amount) death(s). Total deaths for $(game): $(count).',
		params: { amount: 1, game: '', count: 0 } as { amount: number, game: string, count: number },
		paramDescriptions: {
			amount: 'The number of deaths removed.',
			game: 'The name of the currently playing game.',
			count: 'The updated total death count for this game.',
		},
	},
	'deaths.set': {
		default: 'Set death counter for $(game) to $(count).',
		params: { game: '', count: 0 } as { game: string, count: number },
		paramDescriptions: {
			game: 'The name of the currently playing game.',
			count: 'The new death count set for this game.',
		},
	},
	'deaths.reset': {
		default: 'Reset death counter for $(game) to 0.',
		params: { game: '' } as { game: string },
		paramDescriptions: {
			game: 'The name of the currently playing game.',
		},
	},
	'deaths.no-game': {
		default: 'Could not determine currently playing game context.',
		params: undefined,
	},
} as const satisfies TemplateSourceMap

export function registerDeathsTemplates() {
	botLogger.info('Registering deaths templates...')

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
