import type { MapTemplates, TemplateSourceMap } from '../../core/templates'
import { botLogger } from '~~/server/utils/logger'
import { templateRegistry } from '../../core/templates'

const definitions = {
	'twitch.followage.success': {
		default: '$(target) has been following for $(duration).',
		params: { target: '', duration: '' } as { target: string, duration: string },
	},
	'twitch.followage.success-self': {
		default: 'you have been following for $(duration).',
		params: { duration: '' } as { duration: string },
	},
	'twitch.followage.not-following': {
		default: '$(target) is not following this channel.',
		params: { target: '' } as { target: string },
	},
	'twitch.followage.not-following-self': {
		default: 'you are not following this channel.',
		params: undefined,
	},
	'twitch.followage.user-not-found': {
		default: 'Twitch user $(target) could not be found.',
		params: { target: '' } as { target: string },
	},
	'twitch.uptime.online': {
		default: 'The stream has been live for $(duration).',
		params: { duration: '' } as { duration: string },
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
			params: def.params ? Object.keys(def.params) : [],
		})
	}
}

declare module '../../core/templates' {
	interface CommandTemplates extends MapTemplates<typeof definitions> {}
}
