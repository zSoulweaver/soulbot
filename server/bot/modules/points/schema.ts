import { z } from 'zod'
import { NumberParsed, TwitchUser } from '../../core/schemas'

export const PointsArgs = z.tuple([TwitchUser.optional()])
export const PointsAddArgs = z.tuple([
	TwitchUser.describe('user'),
	NumberParsed.describe('amount'),
])

export const PointsGetTopArgs = z.tuple([
	NumberParsed.optional().default(5).describe('count'),
])
