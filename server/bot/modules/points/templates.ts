import type { TemplateSourceMap } from '../../core/templates'
import { botLogger } from '~~/server/utils/logger'
import { templateRegistry } from '../../core/templates'

export const definitions = {
	'points.add': {
		default: 'Added $(amount) $(core.currency) to $(target). They now have $(newAmount) $(core.currency).',
		params: { amount: 0, target: '', newAmount: 0 } as { amount: number, target: string, newAmount: number },
		paramDescriptions: {
			amount: 'The amount of currency being added.',
			target: 'The Twitch username of the user receiving the points.',
			newAmount: 'The user\'s updated total points balance.',
		},
	},
	'points.show': {
		default: '$(target) has $(amount) $(core.currency). Rank #$(leaderboardRank)',
		params: { target: '', amount: 0, leaderboardRank: 0 } as { target: string, amount: number, leaderboardRank: number },
		paramDescriptions: {
			target: 'The Twitch username of the user whose balance is being displayed.',
			amount: 'The user\'s current points balance.',
			leaderboardRank: 'The user\'s position on the points leaderboard.',
		},
	},
	'points.show-self': {
		default: 'you have $(amount) $(core.currency). Rank #$(leaderboardRank)',
		params: { amount: 0, leaderboardRank: 0 } as { amount: number, leaderboardRank: number },
		paramDescriptions: {
			amount: 'Your current points balance.',
			leaderboardRank: 'Your position on the points leaderboard.',
		},
	},
	'points.user-not-found': {
		default: 'User $(target) hasn\'t been seen by the bot yet.',
		params: { target: '' } as { target: string },
		paramDescriptions: {
			target: 'The Twitch username of the user.',
		},
	},
	'points.user-does-not-exist': {
		default: '$(target) does not have an account on Twitch.',
		params: { target: '' } as { target: string },
		paramDescriptions: {
			target: 'The Twitch username of the user.',
		},
	},
	'points.user-no-points': {
		default: '$(target) hasn\'t earned any $(core.currency) yet.',
		params: { target: '' } as { target: string },
		paramDescriptions: {
			target: 'The Twitch username of the user.',
		},
	},
	'points.user-no-points-self': {
		default: 'you haven\'t earned any $(core.currency) yet.',
		params: undefined,
	},
	'points.get-top': {
		default: 'Top $(count) Leaders: $(list)',
		params: { count: 0, list: '' } as { count: number, list: string },
		paramDescriptions: {
			count: 'The number of top users being listed.',
			list: 'The comma-separated leaderboard list with users and their balances.',
		},
	},
	'points.get-top-empty': {
		default: 'The leaderboard is currently empty.',
		params: undefined,
	},
	'points.gift.success': {
		default: 'Gifted $(amount) $(core.currency) to $(target). You now have $(senderPoints) $(core.currency) and they have $(targetPoints) $(core.currency).',
		params: { amount: 0, target: '', senderPoints: 0, targetPoints: 0 } as { amount: number, target: string, senderPoints: number, targetPoints: number },
		paramDescriptions: {
			amount: 'The amount of currency being gifted.',
			target: 'The Twitch username of the user receiving the gift.',
			senderPoints: 'The sender\'s updated points balance.',
			targetPoints: 'The recipient\'s updated points balance.',
		},
	},
	'points.gift.not-enough-points': {
		default: 'You only have $(current) $(core.currency) (tried to gift: $(amount)).',
		params: { current: 0, amount: 0 } as { current: number, amount: number },
		paramDescriptions: {
			current: 'Your current points balance.',
			amount: 'The amount of points you attempted to gift.',
		},
	},
	'points.gift.invalid-amount': {
		default: 'Invalid gift amount. The amount must be a positive integer.',
		params: undefined,
	},
	'points.gift.self': {
		default: 'You cannot gift $(core.currency) to yourself!',
		params: undefined,
	},
	'points.gambling.win': {
		default: 'rolled a $(roll) and won $(winAmount) $(core.currency)! You went from $(oldAmount) to $(newAmount) $(core.currency).',
		params: { sender: '', roll: 0, winAmount: 0, oldAmount: 0, newAmount: 0 } as { sender: string, roll: number, winAmount: number, oldAmount: number, newAmount: number },
		paramDescriptions: {
			sender: 'The Twitch username of the user gambling.',
			roll: 'The number rolled by the user (1-100).',
			winAmount: 'The amount of points won in this roll.',
			oldAmount: 'The user\'s points balance before the roll.',
			newAmount: 'The user\'s new points balance after winning.',
		},
	},
	'points.gambling.lose': {
		default: 'rolled a $(roll) and lost $(betAmount) $(core.currency). You went from $(oldAmount) to $(newAmount) $(core.currency).',
		params: { sender: '', roll: 0, betAmount: 0, oldAmount: 0, newAmount: 0 } as { sender: string, roll: number, betAmount: number, oldAmount: number, newAmount: number },
		paramDescriptions: {
			sender: 'The Twitch username of the user gambling.',
			roll: 'The number rolled by the user (1-100).',
			betAmount: 'The amount of points bet and lost.',
			oldAmount: 'The user\'s points balance before the roll.',
			newAmount: 'The user\'s new points balance after losing.',
		},
	},
	'points.gambling.bonus-win': {
		default: 'rolled a $(roll) and won $(winAmount) bonus $(core.currency)! (Bonus Ticket Used, $(ticketsRemaining) left) You went from $(oldAmount) to $(newAmount) $(core.currency).',
		params: { sender: '', roll: 0, winAmount: 0, oldAmount: 0, newAmount: 0, ticketsRemaining: 0 } as { sender: string, roll: number, winAmount: number, oldAmount: number, newAmount: number, ticketsRemaining: number },
		paramDescriptions: {
			sender: 'The Twitch username of the user gambling.',
			roll: 'The number rolled by the user (1-100).',
			winAmount: 'The amount of points won in this roll.',
			oldAmount: 'The user\'s points balance before the roll.',
			newAmount: 'The user\'s new points balance after winning.',
			ticketsRemaining: 'The number of bonus tickets remaining for the user during this event.',
		},
	},
	'points.gambling.bonus-lose': {
		default: 'rolled a $(roll) and lost $(betAmount) $(core.currency). (Bonus Ticket Used, $(ticketsRemaining) left) You went from $(oldAmount) to $(newAmount) $(core.currency).',
		params: { sender: '', roll: 0, betAmount: 0, oldAmount: 0, newAmount: 0, ticketsRemaining: 0 } as { sender: string, roll: number, betAmount: number, oldAmount: number, newAmount: number, ticketsRemaining: number },
		paramDescriptions: {
			sender: 'The Twitch username of the user gambling.',
			roll: 'The number rolled by the user (1-100).',
			betAmount: 'The amount of points bet and lost.',
			oldAmount: 'The user\'s points balance before the roll.',
			newAmount: 'The user\'s new points balance after losing.',
			ticketsRemaining: 'The number of bonus tickets remaining for the user during this event.',
		},
	},
	'points.gambling.min-bet': {
		default: 'The minimum amount to gamble is $(minBet) $(core.currency).',
		params: { minBet: 0 } as { minBet: number },
		paramDescriptions: {
			minBet: 'The minimum bet required to gamble.',
		},
	},
	'points.gambling.max-bet': {
		default: 'The maximum amount to gamble is $(maxBet) $(core.currency).',
		params: { maxBet: 0 } as { maxBet: number },
		paramDescriptions: {
			maxBet: 'The maximum bet allowed for gambling.',
		},
	},
	'points.gambling.not-enough-points': {
		default: 'You only have $(current) $(core.currency) (bet: $(bet)).',
		params: { current: 0, bet: 0 } as { current: number, bet: number },
		paramDescriptions: {
			current: 'Your current points balance.',
			bet: 'The amount you attempted to bet.',
		},
	},
	'points.gambling.invalid-amount': {
		default: 'Invalid gamble amount. Please use !gamble <amount|all|half>',
		params: undefined,
	},
	'points.gambling.stats': {
		default: '$(target) has $(wins) wins and $(losses) losses, with a net total of $(netAmount) $(core.currency) from gambling.',
		params: { target: '', wins: 0, losses: 0, netAmount: 0 } as { target: string, wins: number, losses: number, netAmount: number },
		paramDescriptions: {
			target: 'The Twitch username of the user whose stats are being displayed.',
			wins: 'The user\'s total gambling wins count.',
			losses: 'The user\'s total gambling losses count.',
			netAmount: 'The user\'s net points won or lost from gambling.',
		},
	},
	'points.gambling.stats-self': {
		default: 'you have $(wins) wins and $(losses) losses, with a net total of $(netAmount) $(core.currency) from gambling.',
		params: { wins: 0, losses: 0, netAmount: 0 } as { wins: number, losses: number, netAmount: number },
		paramDescriptions: {
			wins: 'Your total gambling wins count.',
			losses: 'Your total gambling losses count.',
			netAmount: 'Your net points won or lost from gambling.',
		},
	},
} as const satisfies TemplateSourceMap

export function registerPointsTemplates() {
	botLogger.info('Registering points templates...')

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
