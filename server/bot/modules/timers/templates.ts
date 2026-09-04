import { botLogger } from '~~/server/utils/logger'
import { defineTemplates } from '../../core/templates'

export const timersTemplates = defineTemplates({
	domain: 'timers',
	category: 'general',
	editUrl: '/admin/timers',
	templates: {
		'timers.message': {
			name: 'Periodic Timer Message',
			description: 'Scheduled message rotated periodically to Twitch chat.',
			default: 'Enjoying the stream? Make sure to hit follow and join our Discord!',
		},
	},
})

export function registerTimersTemplates() {
	botLogger.info('Registering timers templates...')
	timersTemplates.register()
}
