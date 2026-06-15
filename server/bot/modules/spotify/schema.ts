import { z } from 'zod'

export const SongRequestArgs = z.preprocess(
	(args) => {
		if (Array.isArray(args) && args.length > 0) {
			return [args.join(' ')]
		}
		return args
	},
	z.tuple([z.string().describe('spotifyLinkOrSearch')]),
)

export const SongRequestBlacklistArgs = z.tuple([z.string().describe('spotifyLink')])

export const SongRequestRemoveArgs = z.tuple([
	z.string().regex(/^\d+$/).transform(Number).describe('position'),
])
