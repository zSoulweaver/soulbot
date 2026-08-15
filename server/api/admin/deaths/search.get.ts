import { formatTwitchBoxArtUrl } from '~~/server/bot/modules/deaths/utils'
import { requireUserRole } from '~~/server/utils/auth'
import { getApiClient } from '~~/server/utils/twurple'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')
	const query = getQuery(event)
	const q = typeof query.q === 'string' ? query.q.trim() : ''

	if (!q) {
		return []
	}

	try {
		const api = getApiClient()
		const searchResult = await api.search.searchCategories(q)
		return searchResult.data.map(game => ({
			id: game.id,
			name: game.name,
			boxArtUrl: formatTwitchBoxArtUrl(game.boxArtUrl, 285, 380),
		}))
	}
	catch {
		return []
	}
})
