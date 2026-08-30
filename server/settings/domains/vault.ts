import { z } from 'zod'
import { defineSettingsDomain } from '../registry'

export const VaultSettingsSchema = z.object({
	minBet: z.number().int().min(1, 'Minimum bet must be at least 1').default(10),
	maxBet: z.number().int().min(1, 'Maximum bet must be at least 1').default(100000),
	winMinRoll: z.number().int().min(1).max(100).default(50),
	winMultiplier: z.number().min(0.1).default(2.0),
	duration: z.number().int().min(15).max(300).default(90),
	warningEnabled: z.boolean().default(true),
	endTime: z.number().default(0),
	startMessage: z.string().default('🚨 VAULT RAID INITIATED! You have $(duration)s to join the squad with !vault <amount> Win Multiplier: $(multiplier)x'),
	warningMessage: z.string().default('⏳ 15 seconds remaining to join the Vault Raid! Current squad: $(raidersCount) raiders with a $(pot) $(core.currency) pot!'),
	endWinMessage: z.string().default('💥 THE VAULT WAS CRACKED! (Rolled $(roll)) $(raidersCount) raiders successfully looted the vault for +$(totalWon) $(core.currency)! Total pool: $(pot) $(core.currency)'),
	endLoseMessage: z.string().default('🔒 THE VAULT DEFENSES HELD! (Rolled $(roll)) $(raidersCount) raiders were caught! A total of $(pot) $(core.currency) was wiped!'),
}).refine(data => data.maxBet >= data.minBet, {
	message: 'Maximum bet must be greater than or equal to minimum bet',
	path: ['maxBet'],
})

export type VaultSettings = z.infer<typeof VaultSettingsSchema>

export const vaultSettings = defineSettingsDomain({
	namespace: 'points.vault',
	schema: VaultSettingsSchema,
})
