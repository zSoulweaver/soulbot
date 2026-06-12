import { z } from 'zod'

export const SongRequestArgs = z.tuple([z.string().describe('spotifyLinkOrSub')])

export const SongRequestBlacklistArgs = z.tuple([z.string().describe('spotifyLink')])

export const SongRequestRemoveArgs = z.tuple([
	z.string().regex(/^\d+$/).transform(Number).describe('position'),
])
