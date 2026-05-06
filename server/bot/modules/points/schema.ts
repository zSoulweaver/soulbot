import { z } from 'zod'
import { NumberParsed, TwitchUser } from '../../core/schemas'

export const PointsArgs = z.tuple([TwitchUser.optional()])
export const PointsAddArgs = z.tuple([
	TwitchUser.describe('user'),
	NumberParsed.describe('amount'),
])
