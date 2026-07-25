import { z } from 'zod'
import { NumberParsed } from '../../core/schemas'

export const DeathsAmountArgs = z.tuple([
	NumberParsed.optional().default(1).describe('amount'),
])

export const DeathsSetArgs = z.tuple([
	NumberParsed.refine(val => Number.isInteger(val) && val >= 0, {
		message: 'must be a non-negative integer',
	}).describe('count'),
])
