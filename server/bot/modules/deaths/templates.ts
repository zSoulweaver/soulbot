import type { InferTemplateParams } from '../../core/templates'
import { botLogger } from '~~/server/utils/logger'
import { defineTemplates } from '../../core/templates'

export const deathsTemplates = defineTemplates({
	domain: 'commands',
	category: 'command',
	editUrl: '/admin/commands/deaths',
	templates: {
		'deaths.show': {
			default: '$(streamer) has died $(count) times in $(game)$(counter_suffix).$(total_suffix)',
			params: {
				streamer: { label: 'Streamer Name', description: 'The display name or username of the streamer.', example: 'CoolFella123' },
				game: { label: 'Game Name', description: 'The name of the currently playing game.', example: 'Elden Ring' },
				counter: { label: 'Counter Name', description: 'The name of the active or targeted counter.', example: 'Boss Fights' },
				counter_suffix: { label: 'Counter Suffix', description: 'Counter suffix if non-default (e.g. " [DLC]").', example: ' [DLC]' },
				count: { label: 'Death Count', description: 'The death count for this specific counter.', example: 12 },
				total: { label: 'Total Deaths', description: 'The total death count across all counters for this game.', example: 48 },
				total_suffix: { label: 'Total Suffix', description: 'Optional total suffix if multiple counters exist.', example: ' (Total: 48)' },
			},
		},
		'deaths.add': {
			default: 'Added $(amount) death(s)! Total deaths for $(game)$(counter_suffix): $(count).$(total_suffix)',
			params: {
				amount: { label: 'Amount Added', description: 'The number of deaths added.', example: 1 },
				game: { label: 'Game Name', description: 'The name of the currently playing game.', example: 'Elden Ring' },
				counter: { label: 'Counter Name', description: 'The name of the targeted counter.', example: 'Boss Fights' },
				counter_suffix: { label: 'Counter Suffix', description: 'Counter suffix if non-default (e.g. " [DLC]").', example: ' [DLC]' },
				count: { label: 'Updated Count', description: 'The updated death count for this counter.', example: 13 },
				total: { label: 'Updated Total', description: 'The updated total death count across all counters for this game.', example: 49 },
				total_suffix: { label: 'Total Suffix', description: 'Optional total suffix if multiple counters exist.', example: ' (Total: 49)' },
			},
		},
		'deaths.remove': {
			default: 'Removed $(amount) death(s). Total deaths for $(game)$(counter_suffix): $(count).$(total_suffix)',
			params: {
				amount: { label: 'Amount Removed', description: 'The number of deaths removed.', example: 1 },
				game: { label: 'Game Name', description: 'The name of the currently playing game.', example: 'Elden Ring' },
				counter: { label: 'Counter Name', description: 'The name of the targeted counter.', example: 'Boss Fights' },
				counter_suffix: { label: 'Counter Suffix', description: 'Counter suffix if non-default (e.g. " [DLC]").', example: ' [DLC]' },
				count: { label: 'Updated Count', description: 'The updated death count for this counter.', example: 11 },
				total: { label: 'Updated Total', description: 'The updated total death count across all counters for this game.', example: 47 },
				total_suffix: { label: 'Total Suffix', description: 'Optional total suffix if multiple counters exist.', example: ' (Total: 47)' },
			},
		},
		'deaths.set': {
			default: 'Set death counter for $(game)$(counter_suffix) to $(count).$(total_suffix)',
			params: {
				game: { label: 'Game Name', description: 'The name of the currently playing game.', example: 'Elden Ring' },
				counter: { label: 'Counter Name', description: 'The name of the targeted counter.', example: 'Boss Fights' },
				counter_suffix: { label: 'Counter Suffix', description: 'Counter suffix if non-default (e.g. " [DLC]").', example: ' [DLC]' },
				count: { label: 'Set Count', description: 'The new death count set for this counter.', example: 25 },
				total: { label: 'Total Deaths', description: 'The updated total death count across all counters for this game.', example: 60 },
				total_suffix: { label: 'Total Suffix', description: 'Optional total suffix if multiple counters exist.', example: ' (Total: 60)' },
			},
		},
		'deaths.reset': {
			default: 'Reset death counter for $(game)$(counter_suffix) to 0.$(total_suffix)',
			params: {
				game: { label: 'Game Name', description: 'The name of the currently playing game.', example: 'Elden Ring' },
				counter: { label: 'Counter Name', description: 'The name of the targeted counter.', example: 'Boss Fights' },
				counter_suffix: { label: 'Counter Suffix', description: 'Counter suffix if non-default (e.g. " [DLC]").', example: ' [DLC]' },
				total: { label: 'Total Deaths', description: 'The updated total death count across all counters for this game.', example: 35 },
				total_suffix: { label: 'Total Suffix', description: 'Optional total suffix if multiple counters exist.', example: ' (Total: 35)' },
			},
		},
		'deaths.select': {
			default: 'Switched active death counter for $(game) to "$(counter)" ($(count) deaths).',
			params: {
				game: { label: 'Game Name', description: 'The name of the currently playing game.', example: 'Elden Ring' },
				counter: { label: 'Counter Name', description: 'The newly active counter name.', example: 'Boss Fights' },
				count: { label: 'Counter Deaths', description: 'The death count for this counter.', example: 15 },
				total: { label: 'Total Deaths', description: 'The total death count for this game.', example: 45 },
			},
		},
		'deaths.list': {
			default: 'Death counters for $(game): $(list).',
			params: {
				game: { label: 'Game Name', description: 'The name of the currently playing game.', example: 'Elden Ring' },
				list: { label: 'Counters List', description: 'Formatted summary of counters.', example: 'Main (30), Boss Fights (15)' },
				total: { label: 'Total Deaths', description: 'The total death count across all counters.', example: 45 },
			},
		},
		'deaths.rename': {
			default: 'Renamed counter "$(old)" to "$(new)" for $(game).',
			params: {
				game: { label: 'Game Name', description: 'The name of the currently playing game.', example: 'Elden Ring' },
				old: { label: 'Old Counter Name', description: 'The previous counter name.', example: 'Bosses' },
				new: { label: 'New Counter Name', description: 'The new counter name.', example: 'Boss Fights' },
			},
		},
		'deaths.counter-not-found': {
			default: 'Counter "$(counter)" not found for $(game).',
			params: {
				game: { label: 'Game Name', description: 'The name of the currently playing game.', example: 'Elden Ring' },
				counter: { label: 'Counter Name', description: 'The counter name that was not found.', example: 'Speedrun' },
			},
		},
		'deaths.no-game': {
			default: 'Could not determine currently playing game context.',
		},
		'widgets.deaths': {
			name: 'Death Counter Overlay',
			domain: 'widgets',
			category: 'general',
			editUrl: '/admin/widgets/deaths',
			description: 'Stream overlay text display template for death and game counters.',
			default: '$(game) Deaths: $(count)',
			params: {
				game: { label: 'Current Game Name', description: 'Name of the current active game.', example: 'Elden Ring' },
				counter: { label: 'Active Counter Name', description: 'Name of the active counter category (e.g. DLC).', example: 'Default' },
				count: { label: 'Active Counter Count', description: 'Death count for the active counter.', example: 14 },
				total: { label: 'Total Game Deaths', description: 'Cumulative deaths across all counters for this game.', example: 32 },
			},
		},
	},
})

export function registerDeathsTemplates() {
	botLogger.info('Registering deaths templates...')
	deathsTemplates.register()
}

declare module '../../core/templates' {
	interface CommandTemplates extends InferTemplateParams<typeof deathsTemplates> {}
}
