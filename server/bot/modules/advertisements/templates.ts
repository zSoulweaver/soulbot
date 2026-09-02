import type { MapTemplates, TemplateSourceMap } from '../../core/templates'
import { botLogger } from '~~/server/utils/logger'
import { buildTemplateParams, templateRegistry } from '../../core/templates'

const definitions = {
	'ads.commercial.success': {
		default: 'Successfully started a $(duration) second commercial break.',
		params: { duration: 0 } as { duration: number },
		paramMeta: {
			duration: { label: 'Break Duration', description: 'The length of the commercial break in seconds.', example: 90 },
		},
	},
	'ads.commercial.error': {
		default: 'Failed to start commercial: $(error)',
		params: { error: '' } as { error: string },
		paramMeta: {
			error: { label: 'Error Reason', description: 'The reason why starting the commercial failed.', example: 'Commercials can only be run while live.' },
		},
	},
	'ads.snooze.success': {
		default: 'Successfully snoozed upcoming ad. Remaining snoozes: $(snoozeCount).',
		params: { snoozeCount: 0 } as { snoozeCount: number },
		paramMeta: {
			snoozeCount: { label: 'Snoozes Remaining', description: 'Number of remaining snoozes available.', example: 2 },
		},
	},
	'ads.snooze.error': {
		default: 'Failed to snooze ad: $(error)',
		params: { error: '' } as { error: string },
		paramMeta: {
			error: { label: 'Error Reason', description: 'The reason why snoozing the ad failed.', example: 'No upcoming commercial to snooze.' },
		},
	},
} as const satisfies TemplateSourceMap

export function registerAdsTemplates() {
	botLogger.info('Registering ads templates...')

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
