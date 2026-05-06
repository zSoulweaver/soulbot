import type { TemplateSourceMap } from '../../core/templates'
import { templateRegistry } from '../../core/templates'

export const definitions = {
	'points.add': {
		default: 'Added ${amount} points to ${target}. They now have ${newAmount} points.',
		params: { amount: 0, target: '', newAmount: 0 } as { amount: number, target: string, newAmount: number },
	},
	'points.show': {
		default: '${target} has ${amount} points.',
		params: { target: '', amount: 0 } as { target: string, amount: number },
	},
	'points.show-self': {
		default: 'you have have ${amount} points.',
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
		default: '${target} hasn\'t earned any points yet.',
		params: { target: '' } as { target: string },
	},
	'points.user-no-points-self': {
		default: 'you haven\'t earned any points yet.',
		params: undefined,
	},
} as const satisfies TemplateSourceMap

export function registerPointsTemplates() {
	console.log('[Points] Registering templates...')

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
