import { requireUserRole } from '~~/server/utils/auth'
import { getAppSettingsSync } from '~~/server/utils/settings'
import { getValidSpotifyToken } from '~~/server/utils/spotify'

interface SpotifyPlaylist {
	id: string
	name: string
	image?: string | null
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

	const appSettings = getAppSettingsSync()
	const requestPlaylistId = appSettings.spotifyRequestPlaylistId

	try {
		// Fetch user profile first to get user ID
		const me = await $fetch<{ id: string }>('https://api.spotify.com/v1/me', {
			headers: {
				Authorization: `Bearer ${token.accessToken}`,
			},
		})

		// Fetch all playlists (paginated)
		let nextUrl: string | null = 'https://api.spotify.com/v1/me/playlists?limit=50'
		const allItems: any[] = []

		while (nextUrl) {
			const res: { items: any[], next: string | null } = await $fetch<{ items: any[], next: string | null }>(nextUrl, {
				headers: {
					Authorization: `Bearer ${token.accessToken}`,
				},
			})
			if (res.items && res.items.length > 0) {
				allItems.push(...res.items)
			}
			nextUrl = res.next
		}

		// Filter for owned or collaborative playlists, and exclude the bot's request playlist
		const filtered: SpotifyPlaylist[] = allItems
			?.filter((p: any) => (p.owner.id === me.id || p.collaborative === true) && p.id !== requestPlaylistId)
			.map((p: any) => ({
				id: p.id,
				name: p.name,
				image: p.images?.[0]?.url || null,
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
