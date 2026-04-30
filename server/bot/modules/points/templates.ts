import { templateRegistry } from '../../core/templates'

export function registerPointsTemplates() {
	console.log('[Points] Registering templates...')

	templateRegistry.register({
		id: 'points.add',
		default: 'Added ${amount} points to ${target}. They now have ${newAmount} points.',
		params: ['amount', 'target', 'newAmount'] as const,
	})

	templateRegistry.register({
		id: 'points.show',
		default: '${target} has ${amount} points.',
		params: ['target', 'amount'] as const,
	})

	templateRegistry.register({
		id: 'points.show-self',
		default: 'you have have ${amount} points.',
		params: ['target', 'amount'] as const,
	})

	templateRegistry.register({
		id: 'points.user-not-found',
		default: 'User ${target} hasn\'t been seen by the bot yet.',
		params: ['target'] as const,
	})

	templateRegistry.register({
		id: 'points.user-no-points',
		default: '${target} hasn\'t earned any points yet.',
		params: ['target'] as const,
	})

	templateRegistry.register({
		id: 'points.user-no-points-self',
		default: 'you haven\'t earned any points yet.',
	})
}

// 2. Augment the global CommandTemplates interface for type safety
declare module '../../core/templates' {
	interface CommandTemplates {
		'points.add': { amount: number, target: string, newAmount: number }
		'points.show': { target: string, amount: number }
		'points.show-self': { amount: number }
		'points.user-not-found': { target: string }
		'points.user-no-points': { target: string }
		'points.user-no-points-self': undefined
	}
}
