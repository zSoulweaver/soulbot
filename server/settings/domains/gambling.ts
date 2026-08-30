import { z } from 'zod'
import { defineSettingsDomain } from '../registry'

export const GamblingSettingsSchema = z.object({
	minBet: z.number().int().min(1, 'Minimum bet must be at least 1').default(10),
	maxBet: z.number().int().min(1, 'Maximum bet must be at least 1').default(100000),
	winMinRoll: z.number().int().min(1).max(100).default(50),
	winMultiplier: z.number().min(0.1).default(1.0),
	bonusDuration: z.number().int().min(1).max(30).default(5),
	bonusWinMultiplier: z.number().min(0.1).default(2.0),
	bonusWinMinRoll: z.number().int().min(1).max(100).default(50),
	bonusTicketsPerUser: z.number().int().min(1, 'Bonus tickets per user must be at least 1').default(5),
	bonusMessage: z.string().default('A limited-time gambling bonus event is now active! Win multiplier is $(multiplier)x and win threshold is $(threshold)% for the next $(duration) minutes! Everyone gets $(tickets) bonus bets!'),
	bonusEndMessage: z.string().default('The limited-time gambling bonus event has ended! Win multiplier and win threshold have returned to normal.'),
	bonusEndTime: z.number().default(0),
}).refine(data => data.maxBet >= data.minBet, {
	message: 'Maximum bet must be greater than or equal to minimum bet',
	path: ['maxBet'],
})

export type GamblingSettings = z.infer<typeof GamblingSettingsSchema>

export const gamblingSettings = defineSettingsDomain({
	namespace: 'points.gambling',
	schema: GamblingSettingsSchema,
})
