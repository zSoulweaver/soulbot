import { z } from 'zod'
import { TwitchUser } from '../../core/schemas'

export const TimeArgs = z.tuple([TwitchUser.optional()])
