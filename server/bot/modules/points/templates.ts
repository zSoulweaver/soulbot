import type { TemplateSourceMap } from '../../core/templates'
import { botLogger } from '~~/server/utils/logger'
import { templateRegistry } from '../../core/templates'

export const definitions = {
	'points.add': {
		default: 'Added ${amount} ${core.currency} to ${target}. They now have ${newAmount} ${core.currency}.',
		params: { amount: 0, target: '', newAmount: 0 } as { amount: number, target: string, newAmount: number },
	},
	'points.show': {
		default: '${target} has ${amount} ${core.currency}.',
		params: { target: '', amount: 0 } as { target: string, amount: number },
	},
	'points.show-self': {
		default: 'you have have ${amount} ${core.currency}.',
		params: { amount: 0 } as { amount: number },
	},
	'points.user-not-found': {
		default: 'User ${target} hasn\'t been seen by the bot yet.',
		params: { target: '' } as { target: string },
	},
	'points.user-does-not-exist': {
		default: '${target} does not have an account on Twitch.',
		params: { target: '' } as { target: string },
	},
	'points.user-no-points': {
		default: '${target} hasn\'t earned any ${core.currency} yet.',
		params: { target: '' } as { target: string },
	},
	'points.user-no-points-self': {
		default: 'you haven\'t earned any ${core.currency} yet.',
		params: undefined,
	},
	'points.get-top': {
		default: 'Top ${count} Leaders: ${list}',
		params: { count: 0, list: '' } as { count: number, list: string },
	},
	'points.get-top-empty': {
		default: 'The leaderboard is currently empty.',
		params: undefined,
	},
} as const satisfies TemplateSourceMap

export function registerPointsTemplates() {
	botLogger.info('Registering points templates...')

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
