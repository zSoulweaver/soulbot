import { z } from 'zod'

// Clean twitch username: strip @ and lowercase
export const TwitchUser = z.string().transform(s => s.replace(/^@/, '').toLowerCase())

// Standard number parser using refine for validation and transform for transformation
export const NumberParsed = z.string()
	.refine(s => !Number.isNaN(Number(s)), { message: 'must be a number' })
	.transform(s => Number(s))
