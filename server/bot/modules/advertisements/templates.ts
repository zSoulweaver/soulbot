import type { InferTemplateParams } from '../../core/templates'
import { botLogger } from '~~/server/utils/logger'
import { defineTemplates } from '../../core/templates'

export const adsTemplates = defineTemplates({
	domain: 'commands',
	category: 'command',
	editUrl: '/admin/commands/core',
	templates: {
		'ads.alert': {
			name: 'Ad Break Warning Message',
			domain: 'ads',
			category: 'general',
			editUrl: '/admin/advertisements',
			description: 'Chat warning message posted before a scheduled commercial break starts.',
			default: 'Ad break of $(duration) seconds is starting in $(time)!',
			params: {
				time: { label: 'Time Until Break', description: 'Formatted countdown time until the ad break begins.', example: '5 minutes' },
				duration: { label: 'Ad Break Duration', description: 'Duration of the upcoming commercial break in seconds.', example: 90 },
			},
		},
		'ads.commercial.success': {
			name: 'Commercial Success Message',
			default: 'Successfully started a $(duration) second commercial break.',
			params: {
				duration: { label: 'Break Duration', description: 'The length of the commercial break in seconds.', example: 90 },
			},
		},
		'ads.commercial.error': {
			name: 'Commercial Error Message',
			default: 'Failed to start commercial: $(error)',
			params: {
				error: { label: 'Error Reason', description: 'The reason why starting the commercial failed.', example: 'Commercials can only be run while live.' },
			},
		},
		'ads.snooze.success': {
			name: 'Snooze Success Message',
			default: 'Successfully snoozed upcoming ad. Remaining snoozes: $(snoozeCount).',
			params: {
				snoozeCount: { label: 'Snoozes Remaining', description: 'Number of remaining snoozes available.', example: 2 },
			},
		},
		'ads.snooze.error': {
			name: 'Snooze Error Message',
			default: 'Failed to snooze ad: $(error)',
			params: {
				error: { label: 'Error Reason', description: 'The reason why snoozing the ad failed.', example: 'No upcoming commercial to snooze.' },
			},
		},
	},
})

export function registerAdsTemplates() {
	botLogger.info('Registering ads templates...')
	adsTemplates.register()
}

declare module '../../core/templates' {
	interface CommandTemplates extends InferTemplateParams<typeof adsTemplates> {}
}
