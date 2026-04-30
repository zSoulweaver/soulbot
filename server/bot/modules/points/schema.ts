import { type } from 'arktype'
import { NumberParsed, TwitchUser } from '../../core/schemas'

export const PointsArgs = type([TwitchUser.optional()])
export const PointsAddArgs = type([TwitchUser, NumberParsed])
