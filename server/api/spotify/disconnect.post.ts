import { eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { spotifyTokens } from '~~/server/database/schema'
import { requireUserRole } from '~~/server/utils/auth'
import { clearSpotifyTokenCache } from '~~/server/utils/spotify'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'caster')

	await db.delete(spotifyTokens).where(eq(spotifyTokens.id, 'streamer'))
	clearSpotifyTokenCache()

	return {
		status: 'ok',
	}
})
