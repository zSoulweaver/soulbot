import type { InferTemplateParams } from '../../core/templates'
import { botLogger } from '~~/server/utils/logger'
import { defineTemplates } from '../../core/templates'

export const watchtimeTemplates = defineTemplates({
	domain: 'commands',
	category: 'command',
	editUrl: '/admin/commands/watchtime',
	templates: {
		'watchtime.show': {
			default: '$(target) has spent $(time) hanging out in chat and is rank #$(rank) on the leaderboard.',
			params: {
				target: { label: 'Target User', description: 'The Twitch username of the user.', example: 'CoolFella123' },
				time: { label: 'Watch Time', description: 'The formatted watch time duration (e.g. "2 hours, 15 minutes").', example: '2 hours, 15 minutes' },
				rank: { label: 'Leaderboard Rank', description: 'The user\'s rank on the watch time leaderboard.', example: 3 },
			},
		},
		'watchtime.show-self': {
			default: 'you have spent $(time) hanging out in chat and are rank #$(rank) on the leaderboard.',
			params: {
				time: { label: 'Watch Time', description: 'Your formatted watch time duration.', example: '2 hours, 15 minutes' },
				rank: { label: 'Leaderboard Rank', description: 'Your rank on the watch time leaderboard.', example: 3 },
			},
		},
		'watchtime.user-no-time': {
			default: '$(target) hasn\'t accumulated any watch time yet.',
			params: {
				target: { label: 'Target User', description: 'The Twitch username of the user.', example: 'CoolFella123' },
			},
		},
		'watchtime.user-no-time-self': {
			default: 'you haven\'t accumulated any watch time yet.',
		},
	},
})

export function registerWatchTimeTemplates() {
	botLogger.info('Registering watch time templates...')
	watchtimeTemplates.register()
}

declare module '../../core/templates' {
	interface CommandTemplates extends InferTemplateParams<typeof watchtimeTemplates> {}
}
