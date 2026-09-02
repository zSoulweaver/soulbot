import type { MapTemplates, TemplateSourceMap } from '../../core/templates'
import { botLogger } from '~~/server/utils/logger'
import { buildTemplateParams, templateRegistry } from '../../core/templates'

const definitions = {
	'twitch.followage.success': {
		default: '$(target) has been following for $(duration).',
		params: { target: '', duration: '' } as { target: string, duration: string },
		paramMeta: {
			target: { label: 'Target User', description: 'The Twitch username of the user.', example: 'CoolFella123' },
			duration: { label: 'Follow Duration', description: 'The formatted duration they have been following (e.g. "1 year, 2 months").', example: '1 year, 2 months' },
		},
	},
	'twitch.followage.success-self': {
		default: 'you have been following for $(duration).',
		params: { duration: '' } as { duration: string },
		paramMeta: {
			duration: { label: 'Follow Duration', description: 'The formatted duration you have been following.', example: '1 year, 2 months' },
		},
	},
	'twitch.followage.not-following': {
		default: '$(target) is not following this channel.',
		params: { target: '' } as { target: string },
		paramMeta: {
			target: { label: 'Target User', description: 'The Twitch username of the user.', example: 'CoolFella123' },
		},
	},
	'twitch.followage.not-following-self': {
		default: 'you are not following this channel.',
		params: undefined,
	},
	'twitch.followage.user-not-found': {
		default: 'Twitch user $(target) could not be found.',
		params: { target: '' } as { target: string },
		paramMeta: {
			target: { label: 'Target User', description: 'The Twitch username of the user.', example: 'CoolFella123' },
		},
	},
	'twitch.uptime.online': {
		default: 'The stream has been live for $(duration).',
		params: { duration: '' } as { duration: string },
		paramMeta: {
			duration: { label: 'Uptime Duration', description: 'The formatted uptime duration of the live stream (e.g. "3 hours, 45 minutes").', example: '3 hours, 45 minutes' },
		},
	},
	'twitch.uptime.offline': {
		default: 'The stream is currently offline.',
		params: undefined,
	},
} as const satisfies TemplateSourceMap

export function registerTwitchTemplates() {
	botLogger.info('Registering twitch templates...')

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
