import { z } from 'zod'
import { NumberParsed, TwitchUser } from '../../core/schemas'

export const PointsArgs = z.tuple([TwitchUser.optional()])
export const PointsAddArgs = z.tuple([
	TwitchUser.describe('user'),
	NumberParsed.describe('amount'),
])

export const PointsGiftArgs = z.tuple([
	TwitchUser.describe('user'),
	NumberParsed.refine(val => Number.isInteger(val) && val > 0, {
		message: 'must be a positive integer',
	}).describe('amount'),
])

export const PointsGetTopArgs = z.tuple([
	NumberParsed.optional().default(5).describe('count'),
])

export const GambleArgs = z.tuple([z.string().describe('amount')])
export const GambleStatsArgs = z.tuple([z.string().optional().describe('user')])
