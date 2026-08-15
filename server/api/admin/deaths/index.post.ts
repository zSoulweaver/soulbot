import { fetchTwitchGameMetadata, updateGameDeathCount } from '~~/server/bot/modules/deaths/utils'
import { requireUserRole } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')
	const body = await readBody(event)

	if (!body || typeof body.gameName !== 'string' || !body.gameName.trim()) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Game name is required',
		})
	}

	const gameName = body.gameName.trim()
	const deaths = Math.max(0, Math.floor(Number(body.deaths) || 0))
	let twitchGameId: string | null = body.twitchGameId || null
	let boxArtUrl: string | null = body.boxArtUrl || null

	if (!twitchGameId || !boxArtUrl) {
		const fetched = await fetchTwitchGameMetadata(gameName)
		if (!twitchGameId && fetched.twitchGameId)
			twitchGameId = fetched.twitchGameId
		if (!boxArtUrl && fetched.boxArtUrl)
			boxArtUrl = fetched.boxArtUrl
	}

	const recordId = body.id ? Number(body.id) : null
	return await updateGameDeathCount(gameName, deaths, {
		twitchGameId,
		boxArtUrl,
	}, recordId)
})
