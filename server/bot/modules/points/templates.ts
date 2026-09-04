import type { InferTemplateParams } from '../../core/templates'
import { botLogger } from '~~/server/utils/logger'
import { defineTemplates } from '../../core/templates'

export const pointsTemplates = defineTemplates({
	domain: 'commands',
	category: 'command',
	editUrl: '/admin/commands/core',
	templates: {
		'points.add': {
			default: 'Added $(amount) $(core.currency) to $(target). They now have $(newAmount) $(core.currency).',
			params: {
				amount: {
					label: 'Amount Added',
					description: 'The amount of currency being added.',
					example: 100,
				},
				target: {
					label: 'Recipient Username',
					description: 'The Twitch username of the user receiving the points.',
					example: 'CoolFella123',
				},
				newAmount: {
					label: 'New Balance',
					description: 'The user\'s updated total points balance.',
					example: 1500,
				},
			},
		},
		'points.show': {
			default: '$(target) has $(amount) $(core.currency). Rank #$(leaderboardRank)',
			params: {
				target: {
					label: 'Target User',
					description: 'The Twitch username of the user whose balance is being displayed.',
					example: 'CoolFella123',
				},
				amount: {
					label: 'Points Balance',
					description: 'The user\'s current points balance.',
					example: 100,
				},
				leaderboardRank: {
					label: 'Leaderboard Rank',
					description: 'The user\'s position on the points leaderboard.',
					example: 4,
				},
			},
		},
		'points.show-self': {
			default: 'you have $(amount) $(core.currency). Rank #$(leaderboardRank)',
			params: {
				amount: {
					label: 'Points Balance',
					description: 'Your current points balance.',
					example: 100,
				},
				leaderboardRank: {
					label: 'Leaderboard Rank',
					description: 'Your position on the points leaderboard.',
					example: 4,
				},
			},
		},
		'points.user-not-found': {
			default: 'User $(target) hasn\'t been seen by the bot yet.',
			params: {
				target: {
					label: 'Target User',
					description: 'The Twitch username of the user.',
					example: 'CoolFella123',
				},
			},
		},
		'points.user-does-not-exist': {
			default: '$(target) does not have an account on Twitch.',
			params: {
				target: {
					label: 'Target User',
					description: 'The Twitch username of the user.',
					example: 'CoolFella123',
				},
			},
		},
		'points.user-no-points': {
			default: '$(target) hasn\'t earned any $(core.currency) yet.',
			params: {
				target: {
					label: 'Target User',
					description: 'The Twitch username of the user.',
					example: 'CoolFella123',
				},
			},
		},
		'points.user-no-points-self': {
			default: 'you haven\'t earned any $(core.currency) yet.',
		},
		'points.get-top': {
			default: 'Top $(count) Leaders: $(list)',
			params: {
				count: {
					label: 'Leader Count',
					description: 'The number of top users being listed.',
					example: 5,
				},
				list: {
					label: 'Leaderboard Summary',
					description: 'The comma-separated leaderboard list with users and their balances.',
					example: '1. CoolFella123 (5,000), 2. ViewerTwo (3,200), 3. ViewerThree (1,800)',
				},
			},
		},
		'points.get-top-empty': {
			default: 'The leaderboard is currently empty.',
		},
		'points.gift.success': {
			default: 'Gifted $(amount) $(core.currency) to $(target). You now have $(senderPoints) $(core.currency) and they have $(targetPoints) $(core.currency).',
			params: {
				amount: {
					label: 'Gift Amount',
					description: 'The amount of currency being gifted.',
					example: 50,
				},
				target: {
					label: 'Recipient Username',
					description: 'The Twitch username of the user receiving the gift.',
					example: 'ViewerTwo',
				},
				senderPoints: {
					label: 'Sender Points',
					description: 'The sender\'s updated points balance.',
					example: 950,
				},
				targetPoints: {
					label: 'Recipient Points',
					description: 'The recipient\'s updated points balance.',
					example: 250,
				},
			},
		},
		'points.gift.not-enough-points': {
			default: 'You only have $(current) $(core.currency) (tried to gift: $(amount)).',
			params: {
				current: {
					label: 'Current Balance',
					description: 'Your current points balance.',
					example: 30,
				},
				amount: {
					label: 'Attempted Amount',
					description: 'The amount of points you attempted to gift.',
					example: 50,
				},
			},
		},
		'points.gift.invalid-amount': {
			default: 'Invalid gift amount. The amount must be a positive integer.',
		},
		'points.gift.self': {
			default: 'You cannot gift $(core.currency) to yourself!',
		},
		'points.gambling.win': {
			default: 'rolled a $(roll) and won $(winAmount) $(core.currency)! You went from $(oldAmount) to $(newAmount) $(core.currency).',
			params: {
				sender: {
					label: 'Gambler Username',
					description: 'The Twitch username of the user gambling.',
					example: 'CoolFella123',
				},
				roll: {
					label: 'Die Roll',
					description: 'The number rolled by the user (1-100).',
					example: 88,
				},
				winAmount: {
					label: 'Amount Won',
					description: 'The amount of points won in this roll.',
					example: 100,
				},
				oldAmount: {
					label: 'Previous Balance',
					description: 'The user\'s points balance before the roll.',
					example: 500,
				},
				newAmount: {
					label: 'New Balance',
					description: 'The user\'s new points balance after winning.',
					example: 600,
				},
			},
		},
		'points.gambling.lose': {
			default: 'rolled a $(roll) and lost $(betAmount) $(core.currency). You went from $(oldAmount) to $(newAmount) $(core.currency).',
			params: {
				sender: {
					label: 'Gambler Username',
					description: 'The Twitch username of the user gambling.',
					example: 'CoolFella123',
				},
				roll: {
					label: 'Die Roll',
					description: 'The number rolled by the user (1-100).',
					example: 24,
				},
				betAmount: {
					label: 'Amount Lost',
					description: 'The amount of points bet and lost.',
					example: 50,
				},
				oldAmount: {
					label: 'Previous Balance',
					description: 'The user\'s points balance before the roll.',
					example: 500,
				},
				newAmount: {
					label: 'New Balance',
					description: 'The user\'s new points balance after losing.',
					example: 450,
				},
			},
		},
		'points.gambling.bonus-win': {
			default: 'rolled a $(roll) and won $(winAmount) bonus $(core.currency)! (Bonus Ticket Used, $(ticketsRemaining) left) You went from $(oldAmount) to $(newAmount) $(core.currency).',
			params: {
				sender: {
					label: 'Gambler Username',
					description: 'The Twitch username of the user gambling.',
					example: 'CoolFella123',
				},
				roll: {
					label: 'Die Roll',
					description: 'The number rolled by the user (1-100).',
					example: 95,
				},
				winAmount: {
					label: 'Bonus Won',
					description: 'The amount of points won in this roll.',
					example: 200,
				},
				oldAmount: {
					label: 'Previous Balance',
					description: 'The user\'s points balance before the roll.',
					example: 500,
				},
				newAmount: {
					label: 'New Balance',
					description: 'The user\'s new points balance after winning.',
					example: 700,
				},
				ticketsRemaining: {
					label: 'Tickets Remaining',
					description: 'The number of bonus tickets remaining for the user.',
					example: 2,
				},
			},
		},
		'points.gambling.bonus-lose': {
			default: 'rolled a $(roll) and lost $(betAmount) $(core.currency). (Bonus Ticket Used, $(ticketsRemaining) left) You went from $(oldAmount) to $(newAmount) $(core.currency).',
			params: {
				sender: {
					label: 'Gambler Username',
					description: 'The Twitch username of the user gambling.',
					example: 'CoolFella123',
				},
				roll: {
					label: 'Die Roll',
					description: 'The number rolled by the user (1-100).',
					example: 12,
				},
				betAmount: {
					label: 'Amount Lost',
					description: 'The amount of points bet and lost.',
					example: 50,
				},
				oldAmount: {
					label: 'Previous Balance',
					description: 'The user\'s points balance before the roll.',
					example: 500,
				},
				newAmount: {
					label: 'New Balance',
					description: 'The user\'s new points balance after losing.',
					example: 450,
				},
				ticketsRemaining: {
					label: 'Tickets Remaining',
					description: 'The number of bonus tickets remaining for the user.',
					example: 2,
				},
			},
		},
		'points.gambling.min-bet': {
			default: 'The minimum amount to gamble is $(minBet) $(core.currency).',
			params: {
				minBet: {
					label: 'Minimum Bet',
					description: 'The minimum bet required to gamble.',
					example: 10,
				},
			},
		},
		'points.gambling.max-bet': {
			default: 'The maximum amount to gamble is $(maxBet) $(core.currency).',
			params: {
				maxBet: {
					label: 'Maximum Bet',
					description: 'The maximum bet allowed for gambling.',
					example: 1000,
				},
			},
		},
		'points.gambling.not-enough-points': {
			default: 'You only have $(current) $(core.currency) (bet: $(bet)).',
			params: {
				current: {
					label: 'Current Balance',
					description: 'Your current points balance.',
					example: 25,
				},
				bet: {
					label: 'Bet Amount',
					description: 'The amount you attempted to bet.',
					example: 50,
				},
			},
		},
		'points.gambling.invalid-amount': {
			default: 'Invalid gamble amount. Please use !gamble <amount|all|half>',
		},
		'points.gambling.stats': {
			default: '$(target) has $(wins) wins and $(losses) losses, with a net total of $(netAmount) $(core.currency) from gambling.',
			params: {
				target: {
					label: 'Target User',
					description: 'The Twitch username of the user whose stats are being displayed.',
					example: 'CoolFella123',
				},
				wins: {
					label: 'Total Wins',
					description: 'The user\'s total gambling wins count.',
					example: 24,
				},
				losses: {
					label: 'Total Losses',
					description: 'The user\'s total gambling losses count.',
					example: 18,
				},
				netAmount: {
					label: 'Net Profit/Loss',
					description: 'The user\'s net points won or lost from gambling.',
					example: 350,
				},
			},
		},
		'points.gambling.stats-self': {
			default: 'you have $(wins) wins and $(losses) losses, with a net total of $(netAmount) $(core.currency) from gambling.',
			params: {
				wins: {
					label: 'Total Wins',
					description: 'Your total gambling wins count.',
					example: 24,
				},
				losses: {
					label: 'Total Losses',
					description: 'Your total gambling losses count.',
					example: 18,
				},
				netAmount: {
					label: 'Net Profit/Loss',
					description: 'Your net points won or lost from gambling.',
					example: 350,
				},
			},
		},
		'points.vault.joined': {
			default: 'you joined the Vault Raid with $(betAmount) $(core.currency)! (Win: +$(potentialWin), Lose: -$(betAmount))',
			params: {
				sender: {
					label: 'Raider Username',
					description: 'The Twitch username of the user.',
					example: 'CoolFella123',
				},
				betAmount: {
					label: 'Bet Amount',
					description: 'The amount of points bet on the raid.',
					example: 100,
				},
				potentialWin: {
					label: 'Potential Win',
					description: 'The net points the user will win if the vault is cracked.',
					example: 250,
				},
			},
		},
		'points.vault.updated': {
			default: 'updated your Vault Raid bet to $(betAmount) $(core.currency)! (Win: +$(potentialWin), Lose: -$(betAmount))',
			params: {
				sender: {
					label: 'Raider Username',
					description: 'The Twitch username of the user.',
					example: 'CoolFella123',
				},
				betAmount: {
					label: 'Updated Bet',
					description: 'The updated amount of points bet on the raid.',
					example: 200,
				},
				potentialWin: {
					label: 'Updated Potential Win',
					description: 'The updated net points the user will win if the vault is cracked.',
					example: 500,
				},
			},
		},
		'points.vault.opt-out': {
			default: 'you have left the Vault Raid squad and your bet was refunded.',
			params: {
				sender: {
					label: 'Raider Username',
					description: 'The Twitch username of the user.',
					example: 'CoolFella123',
				},
			},
		},
		'points.vault.not-joined': {
			default: 'you are not currently in the Vault Raid squad.',
			params: {
				sender: {
					label: 'Raider Username',
					description: 'The Twitch username of the user.',
					example: 'CoolFella123',
				},
			},
		},
		'points.vault.not-active': {
			default: 'There is no active Vault Raid right now.',
		},
		'points.vault.already-active': {
			default: 'A Vault Raid is already active!',
		},
		'points.vault.cancelled': {
			default: 'The Vault Raid has been cancelled by @$(sender). All bets have been refunded.',
			params: {
				sender: {
					label: 'Moderator Username',
					description: 'The moderator who cancelled the raid.',
					example: 'ModUser',
				},
			},
		},
		'points.vault.min-bet': {
			default: 'The minimum amount to join the Vault Raid is $(minBet) $(core.currency).',
			params: {
				minBet: {
					label: 'Minimum Bet',
					description: 'The minimum bet required to join the vault raid.',
					example: 20,
				},
			},
		},
		'points.vault.max-bet': {
			default: 'The maximum amount to join the Vault Raid is $(maxBet) $(core.currency).',
			params: {
				maxBet: {
					label: 'Maximum Bet',
					description: 'The maximum bet allowed to join the vault raid.',
					example: 500,
				},
			},
		},
		'points.vault.not-enough-points': {
			default: 'You only have $(current) $(core.currency) (tried to bet: $(bet)).',
			params: {
				current: {
					label: 'Current Balance',
					description: 'Your current points balance.',
					example: 40,
				},
				bet: {
					label: 'Attempted Bet',
					description: 'The amount you attempted to bet.',
					example: 100,
				},
			},
		},
		'points.vault.invalid-amount': {
			default: 'Invalid bet amount. Please use !vault <amount|all|half|0>',
		},
		'vault.start': {
			name: 'Vault Raid Start Announcement',
			domain: 'vault',
			category: 'general',
			editUrl: '/admin/loyalty/vault',
			description: 'Chat announcement sent when a communal Vault Raid is initiated.',
			default: '🚨 VAULT RAID INITIATED! You have $(duration)s to join the squad with !vault <amount> Win Multiplier: $(multiplier)x',
			params: {
				duration: {
					label: 'Raid Duration',
					description: 'Duration of the betting window in seconds.',
					example: 90,
				},
				multiplier: {
					label: 'Win Multiplier',
					description: 'Profit multiplier for successful raiders.',
					example: 2,
				},
				minBet: {
					label: 'Minimum Bet',
					description: 'Minimum points required to join.',
					example: 10,
				},
				maxBet: {
					label: 'Maximum Bet',
					description: 'Maximum points allowed per user.',
					example: 100000,
				},
			},
		},
		'vault.warning': {
			name: 'Vault Raid Warning Announcement',
			domain: 'vault',
			category: 'general',
			editUrl: '/admin/loyalty/vault',
			description: 'Chat announcement sent when 15 seconds remain in the betting window.',
			default: '⏳ 15 seconds remaining to join the Vault Raid! Current squad: $(raidersCount) raiders with a $(pot) $(core.currency) pot!',
			params: {
				secondsLeft: {
					label: 'Seconds Remaining',
					description: 'Seconds remaining before betting closes.',
					example: 15,
				},
				raidersCount: {
					label: 'Raiders Count',
					description: 'Total number of users currently entered in the raid.',
					example: 12,
				},
				pot: {
					label: 'Total Pot Size',
					description: 'Total points wagered by all raiders combined.',
					example: 25000,
				},
				multiplier: {
					label: 'Win Multiplier',
					description: 'Profit multiplier for successful raiders.',
					example: 2,
				},
			},
		},
		'vault.win': {
			name: 'Vault Raid Win Announcement',
			domain: 'vault',
			category: 'general',
			editUrl: '/admin/loyalty/vault',
			description: 'Chat announcement sent when the Vault Raid succeeds.',
			default: '💥 THE VAULT WAS CRACKED! (Rolled $(roll)) $(raidersCount) raiders successfully looted the vault for +$(totalWon) $(core.currency)! Total pool: $(pot) $(core.currency)',
			params: {
				roll: {
					label: 'Die Roll Result',
					description: 'The communal roll number from 1 to 100.',
					example: 85,
				},
				threshold: {
					label: 'Winning Roll Threshold',
					description: 'Minimum roll needed to win.',
					example: 50,
				},
				raidersCount: {
					label: 'Raiders Count',
					description: 'Total number of winning raiders.',
					example: 12,
				},
				pot: {
					label: 'Total Initial Pot',
					description: 'Total points wagered by raiders.',
					example: 25000,
				},
				totalWon: {
					label: 'Total Points Paid Out',
					description: 'Total profit paid out to all raiders.',
					example: 50000,
				},
				multiplier: {
					label: 'Win Multiplier',
					description: 'Profit multiplier.',
					example: 2,
				},
			},
		},
		'vault.lose': {
			name: 'Vault Raid Lose Announcement',
			domain: 'vault',
			category: 'general',
			editUrl: '/admin/loyalty/vault',
			description: 'Chat announcement sent when the Vault Raid fails.',
			default: '🔒 THE VAULT DEFENSES HELD! (Rolled $(roll)) $(raidersCount) raiders were caught! A total of $(pot) $(core.currency) was wiped!',
			params: {
				roll: {
					label: 'Die Roll Result',
					description: 'The communal roll number from 1 to 100.',
					example: 24,
				},
				threshold: {
					label: 'Winning Roll Threshold',
					description: 'Minimum roll needed to win.',
					example: 50,
				},
				raidersCount: {
					label: 'Raiders Count',
					description: 'Total number of raiders caught.',
					example: 12,
				},
				pot: {
					label: 'Total Lost Pot',
					description: 'Total points lost in the raid.',
					example: 25000,
				},
				multiplier: {
					label: 'Win Multiplier',
					description: 'Profit multiplier.',
					example: 2,
				},
			},
		},
		'gambling.bonus_start': {
			name: 'Gambling Bonus Event Start Message',
			domain: 'gambling',
			category: 'general',
			editUrl: '/admin/loyalty/gambling',
			description: 'Chat announcement sent when a Gambling Bonus event begins.',
			default: 'A limited-time gambling bonus event is now active! Win multiplier is $(multiplier)x and win threshold is $(threshold)% for the next $(duration) minutes! Everyone gets $(tickets) bonus bets!',
			params: {
				duration: {
					label: 'Bonus Duration (Minutes)',
					description: 'Event duration in minutes.',
					example: 5,
				},
				multiplier: {
					label: 'Bonus Multiplier',
					description: 'Boosted net profit multiplier during the event.',
					example: 2,
				},
				threshold: {
					label: 'Bonus Roll Threshold',
					description: 'Minimum roll needed to win during the bonus event.',
					example: 45,
				},
				tickets: {
					label: 'Bonus Tickets Per User',
					description: 'Number of bonus rolls allocated per viewer.',
					example: 5,
				},
			},
		},
		'gambling.bonus_end': {
			name: 'Gambling Bonus Event End Message',
			domain: 'gambling',
			category: 'general',
			editUrl: '/admin/loyalty/gambling',
			description: 'Chat announcement sent when a Gambling Bonus event concludes.',
			default: 'The limited-time gambling bonus event has ended! Win multiplier and win threshold have returned to normal.',
			params: {
				duration: {
					label: 'Bonus Duration (Minutes)',
					description: 'Event duration in minutes.',
					example: 5,
				},
				multiplier: {
					label: 'Bonus Multiplier',
					description: 'Boosted net profit multiplier.',
					example: 2,
				},
				threshold: {
					label: 'Bonus Roll Threshold',
					description: 'Minimum roll needed.',
					example: 45,
				},
				tickets: {
					label: 'Bonus Tickets Per User',
					description: 'Tickets count.',
					example: 5,
				},
			},
		},
	},
})

export function registerPointsTemplates() {
	botLogger.info('Registering points templates...')
	pointsTemplates.register()
}

declare module '../../core/templates' {
	interface CommandTemplates extends InferTemplateParams<typeof pointsTemplates> {}
}
