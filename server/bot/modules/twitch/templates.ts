import type { MapTemplates, TemplateSourceMap } from '../../core/templates'
import { botLogger } from '~~/server/utils/logger'
import { templateRegistry } from '../../core/templates'

const definitions = {
	'twitch.followage.success': {
		default: '$(target) has been following for $(duration).',
		params: { target: '', duration: '' } as { target: string, duration: string },
		paramDescriptions: {
			target: 'The Twitch username of the user.',
			duration: 'The formatted duration they have been following (e.g. "1 year, 2 months").',
		},
	},
	'twitch.followage.success-self': {
		default: 'you have been following for $(duration).',
		params: { duration: '' } as { duration: string },
		paramDescriptions: {
			duration: 'The formatted duration you have been following.',
		},
	},
	'twitch.followage.not-following': {
		default: '$(target) is not following this channel.',
		params: { target: '' } as { target: string },
		paramDescriptions: {
			target: 'The Twitch username of the user.',
		},
	},
	'twitch.followage.not-following-self': {
		default: 'you are not following this channel.',
		params: undefined,
	},
	'twitch.followage.user-not-found': {
		default: 'Twitch user $(target) could not be found.',
		params: { target: '' } as { target: string },
		paramDescriptions: {
			target: 'The Twitch username of the user.',
		},
	},
	'twitch.uptime.online': {
		default: 'The stream has been live for $(duration).',
		params: { duration: '' } as { duration: string },
		paramDescriptions: {
			duration: 'The formatted uptime duration of the live stream (e.g. "3 hours, 45 minutes").',
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
