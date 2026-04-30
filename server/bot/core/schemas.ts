import { type } from 'arktype'

// Clean twitch username: strip @ and lowercase
export const TwitchUser = type('string').pipe(s => s.replace(/^@/, '').toLowerCase())

// Standard number parser using narrow for validation and pipe for transformation
export const NumberParsed = type('string')
	.narrow((s, ctx) => {
		const n = Number(s)
		return Number.isNaN(n) ? ctx.mustBe('a number') : true
	})
	.pipe(s => Number(s))
