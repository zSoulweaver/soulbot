import { requireUserRole } from '~~/server/utils/auth'
import { getValidSpotifyToken } from '~~/server/utils/spotify'

interface SpotifyPlaylist {
	id: string
	name: string
}

export default defineEventHandler(async (event): Promise<SpotifyPlaylist[]> => {
	await requireUserRole(event, 'caster')
	const token = await getValidSpotifyToken()
	if (!token) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Spotify account not connected',
		})
	}

	try {
		// Fetch user profile first to get user ID
		const me = await $fetch<{ id: string }>('https://api.spotify.com/v1/me', {
			headers: {
				Authorization: `Bearer ${token.accessToken}`,
			},
		})

		// Fetch playlists (limit 50)
		const res = await $fetch<{ items: any[] }>('https://api.spotify.com/v1/me/playlists?limit=50', {
			headers: {
				Authorization: `Bearer ${token.accessToken}`,
			},
		})

		// Filter for owned or collaborative playlists
		const filtered: SpotifyPlaylist[] = res.items
			?.filter((p: any) => p.owner.id === me.id || p.collaborative === true)
			.map((p: any) => ({
				id: p.id,
				name: p.name,
			})) || []

		return filtered
	}
	catch (err: any) {
		throw createError({
			statusCode: 500,
			statusMessage: err.data?.error?.message || 'Failed to fetch Spotify playlists',
		})
	}
})
