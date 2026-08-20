import type { MapTemplates, TemplateSourceMap } from '../../core/templates'
import { botLogger } from '~~/server/utils/logger'
import { templateRegistry } from '../../core/templates'

const definitions = {
	'deaths.show': {
		default: '$(streamer) has died $(count) times in $(game)$(counter_suffix).$(total_suffix)',
		params: { streamer: '', game: '', counter: '', counter_suffix: '', count: 0, total: 0, total_suffix: '' } as { streamer: string, game: string, counter: string, counter_suffix: string, count: number, total: number, total_suffix: string },
		paramDescriptions: {
			streamer: 'The display name or username of the streamer.',
			game: 'The name of the currently playing game.',
			counter: 'The name of the active or targeted counter.',
			counter_suffix: 'Counter suffix if non-default (e.g. " [DLC]").',
			count: 'The death count for this specific counter.',
			total: 'The total death count across all counters for this game.',
			total_suffix: 'Optional total suffix if multiple counters exist (e.g. " (Total: 100)").',
		},
	},
	'deaths.add': {
		default: 'Added $(amount) death(s)! Total deaths for $(game)$(counter_suffix): $(count).$(total_suffix)',
		params: { amount: 1, game: '', counter: '', counter_suffix: '', count: 0, total: 0, total_suffix: '' } as { amount: number, game: string, counter: string, counter_suffix: string, count: number, total: number, total_suffix: string },
		paramDescriptions: {
			amount: 'The number of deaths added.',
			game: 'The name of the currently playing game.',
			counter: 'The name of the targeted counter.',
			counter_suffix: 'Counter suffix if non-default (e.g. " [DLC]").',
			count: 'The updated death count for this counter.',
			total: 'The updated total death count across all counters for this game.',
			total_suffix: 'Optional total suffix if multiple counters exist.',
		},
	},
	'deaths.remove': {
		default: 'Removed $(amount) death(s). Total deaths for $(game)$(counter_suffix): $(count).$(total_suffix)',
		params: { amount: 1, game: '', counter: '', counter_suffix: '', count: 0, total: 0, total_suffix: '' } as { amount: number, game: string, counter: string, counter_suffix: string, count: number, total: number, total_suffix: string },
		paramDescriptions: {
			amount: 'The number of deaths removed.',
			game: 'The name of the currently playing game.',
			counter: 'The name of the targeted counter.',
			counter_suffix: 'Counter suffix if non-default.',
			count: 'The updated death count for this counter.',
			total: 'The updated total death count across all counters for this game.',
			total_suffix: 'Optional total suffix if multiple counters exist.',
		},
	},
	'deaths.set': {
		default: 'Set death counter for $(game)$(counter_suffix) to $(count).$(total_suffix)',
		params: { game: '', counter: '', counter_suffix: '', count: 0, total: 0, total_suffix: '' } as { game: string, counter: string, counter_suffix: string, count: number, total: number, total_suffix: string },
		paramDescriptions: {
			game: 'The name of the currently playing game.',
			counter: 'The name of the targeted counter.',
			counter_suffix: 'Counter suffix if non-default.',
			count: 'The new death count set for this counter.',
			total: 'The updated total death count across all counters for this game.',
			total_suffix: 'Optional total suffix if multiple counters exist.',
		},
	},
	'deaths.reset': {
		default: 'Reset death counter for $(game)$(counter_suffix) to 0.$(total_suffix)',
		params: { game: '', counter: '', counter_suffix: '', total: 0, total_suffix: '' } as { game: string, counter: string, counter_suffix: string, total: number, total_suffix: string },
		paramDescriptions: {
			game: 'The name of the currently playing game.',
			counter: 'The name of the targeted counter.',
			counter_suffix: 'Counter suffix if non-default.',
			total: 'The updated total death count across all counters for this game.',
			total_suffix: 'Optional total suffix if multiple counters exist.',
		},
	},
	'deaths.select': {
		default: 'Switched active death counter for $(game) to "$(counter)" ($(count) deaths).',
		params: { game: '', counter: '', count: 0, total: 0 } as { game: string, counter: string, count: number, total: number },
		paramDescriptions: {
			game: 'The name of the currently playing game.',
			counter: 'The newly active counter name.',
			count: 'The death count for this counter.',
			total: 'The total death count for this game.',
		},
	},
	'deaths.list': {
		default: 'Death counters for $(game): $(list).',
		params: { game: '', list: '', total: 0 } as { game: string, list: string, total: number },
		paramDescriptions: {
			game: 'The name of the currently playing game.',
			list: 'Formatted summary of counters.',
			total: 'The total death count across all counters.',
		},
	},
	'deaths.rename': {
		default: 'Renamed counter "$(old)" to "$(new)" for $(game).',
		params: { game: '', old: '', new: '' } as { game: string, old: string, new: string },
		paramDescriptions: {
			game: 'The name of the currently playing game.',
			old: 'The previous counter name.',
			new: 'The new counter name.',
		},
	},
	'deaths.counter-not-found': {
		default: 'Counter "$(counter)" not found for $(game).',
		params: { game: '', counter: '' } as { game: string, counter: string },
		paramDescriptions: {
			game: 'The name of the currently playing game.',
			counter: 'The counter name that was not found.',
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
