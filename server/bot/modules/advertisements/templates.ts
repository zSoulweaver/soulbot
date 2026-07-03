import type { MapTemplates, TemplateSourceMap } from '../../core/templates'
import { botLogger } from '~~/server/utils/logger'
import { templateRegistry } from '../../core/templates'

const definitions = {
	'ads.commercial.success': {
		default: 'Successfully started a $(duration) second commercial break.',
		params: { duration: 0 } as { duration: number },
		paramDescriptions: {
			duration: 'The length of the commercial break in seconds.',
		},
	},
	'ads.commercial.error': {
		default: 'Failed to start commercial: $(error)',
		params: { error: '' } as { error: string },
		paramDescriptions: {
			error: 'The reason why starting the commercial failed.',
		},
	},
	'ads.snooze.success': {
		default: 'Successfully snoozed upcoming ad. Remaining snoozes: $(snoozeCount).',
		params: { snoozeCount: 0 } as { snoozeCount: number },
		paramDescriptions: {
			snoozeCount: 'Number of remaining snoozes available.',
		},
	},
	'ads.snooze.error': {
		default: 'Failed to snooze ad: $(error)',
		params: { error: '' } as { error: string },
		paramDescriptions: {
			error: 'The reason why snoozing the ad failed.',
		},
	},
} as const satisfies TemplateSourceMap

export function registerAdsTemplates() {
	botLogger.info('Registering ads templates...')

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
