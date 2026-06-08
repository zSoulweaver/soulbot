import type { TemplateSourceMap } from '../../core/templates'
import { botLogger } from '~~/server/utils/logger'
import { templateRegistry } from '../../core/templates'

export const definitions = {
	'points.add': {
		default: 'Added $(amount) $(core.currency) to $(target). They now have $(newAmount) $(core.currency).',
		params: { amount: 0, target: '', newAmount: 0 } as { amount: number, target: string, newAmount: number },
	},
	'points.show': {
		default: '$(target) has $(amount) $(core.currency).',
		params: { target: '', amount: 0 } as { target: string, amount: number },
	},
	'points.show-self': {
		default: 'you have have $(amount) $(core.currency).',
		params: { amount: 0 } as { amount: number },
	},
	'points.user-not-found': {
		default: 'User $(target) hasn\'t been seen by the bot yet.',
		params: { target: '' } as { target: string },
	},
	'points.user-does-not-exist': {
		default: '$(target) does not have an account on Twitch.',
		params: { target: '' } as { target: string },
	},
	'points.user-no-points': {
		default: '$(target) hasn\'t earned any $(core.currency) yet.',
		params: { target: '' } as { target: string },
	},
	'points.user-no-points-self': {
		default: 'you haven\'t earned any $(core.currency) yet.',
		params: undefined,
	},
	'points.get-top': {
		default: 'Top $(count) Leaders: $(list)',
		params: { count: 0, list: '' } as { count: number, list: string },
	},
	'points.get-top-empty': {
		default: 'The leaderboard is currently empty.',
		params: undefined,
	},
	'points.gambling.win': {
		default: '$(sender) rolled a $(roll) and won $(winAmount) $(core.currency)! They went from $(oldAmount) to $(newAmount) $(core.currency).',
		params: { sender: '', roll: 0, winAmount: 0, oldAmount: 0, newAmount: 0 } as { sender: string, roll: number, winAmount: number, oldAmount: number, newAmount: number },
	},
	'points.gambling.lose': {
		default: '$(sender) rolled a $(roll) and lost $(betAmount) $(core.currency). They went from $(oldAmount) to $(newAmount) $(core.currency).',
		params: { sender: '', roll: 0, betAmount: 0, oldAmount: 0, newAmount: 0 } as { sender: string, roll: number, betAmount: number, oldAmount: number, newAmount: number },
	},
	'points.gambling.min-bet': {
		default: 'The minimum amount to gamble is $(minBet) $(core.currency).',
		params: { minBet: 0 } as { minBet: number },
	},
	'points.gambling.max-bet': {
		default: 'The maximum amount to gamble is $(maxBet) $(core.currency).',
		params: { maxBet: 0 } as { maxBet: number },
	},
	'points.gambling.not-enough-points': {
		default: 'You only have $(current) $(core.currency) (bet: $(bet)).',
		params: { current: 0, bet: 0 } as { current: number, bet: number },
	},
	'points.gambling.invalid-amount': {
		default: 'Invalid gamble amount. Please use !gamble <amount|all|half>',
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
