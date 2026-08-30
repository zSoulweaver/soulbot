import { z } from 'zod'
import { defineSettingsDomain } from '../registry'

export const PointsSettingsSchema = z.object({
	currencyName: z.string().min(1, 'Currency singular name is required').default('point'),
	currencyNamePlural: z.string().min(1, 'Currency plural name is required').default('points'),
	payoutInterval: z.number().int().min(1, 'Payout interval must be at least 1 minute').default(5),
	payoutIntervalOffline: z.number().int().min(1, 'Offline payout interval must be at least 1 minute').default(10),
	payoutAmount: z.number().int().min(0, 'Payout amount must be non-negative').default(5),
	payoutAmountOffline: z.number().int().min(0, 'Offline payout amount must be non-negative').default(0),
	activeBonus: z.number().int().min(0, 'Active bonus must be non-negative').default(5),
})

export type PointsSettings = z.infer<typeof PointsSettingsSchema>

export const pointsSettings = defineSettingsDomain({
	namespace: 'points',
	schema: PointsSettingsSchema,
})
