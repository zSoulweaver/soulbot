import { requireUserRole } from '~~/server/utils/auth'
import { getCurrentlyPlaying, getSpotifyRateLimitRemainingSeconds, getSpotifyToken, getSpotifyUserProfile, isSpotifyRateLimited } from '~~/server/utils/spotify'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'caster')

	const query = getQuery(event) || {}
	const forceRefresh = query.refresh === 'true'

	const token = await getSpotifyToken()
	const connected = !!token

	let currentlyPlaying = null
	let profile = null
	if (connected) {
		currentlyPlaying = await getCurrentlyPlaying(forceRefresh)
		profile = await getSpotifyUserProfile(forceRefresh)
	}

	return {
		connected,
		currentlyPlaying,
		profile,
		rateLimited: isSpotifyRateLimited(),
		retryAfter: getSpotifyRateLimitRemainingSeconds(),
	}
})
