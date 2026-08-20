import { fetchTwitchGameMetadata, saveGameWithCounters, updateGameDeathCount } from '~~/server/bot/modules/deaths/utils'
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
	let twitchGameId: string | null = body.twitchGameId || null
	let boxArtUrl: string | null = body.boxArtUrl || null

	if (!twitchGameId || !boxArtUrl) {
		const fetched = await fetchTwitchGameMetadata(gameName)
		if (!twitchGameId && fetched.twitchGameId)
			twitchGameId = fetched.twitchGameId
		if (!boxArtUrl && fetched.boxArtUrl)
			boxArtUrl = fetched.boxArtUrl
	}

	if (Array.isArray(body.counters)) {
		const result = await saveGameWithCounters(gameName, body.counters, {
			twitchGameId,
			boxArtUrl,
		})

		return {
			id: result.game.id,
			gameName: result.game.name,
			twitchGameId: result.game.twitchGameId,
			boxArtUrl: result.game.boxArtUrl,
			deaths: result.activeCounter.deaths,
			totalDeaths: result.totalDeaths,
			counterName: result.activeCounter.name,
			counters: result.counters,
		}
	}

	const deaths = Math.max(0, Math.floor(Number(body.deaths) || 0))
	const counterName = typeof body.counterName === 'string' && body.counterName.trim()
		? body.counterName.trim()
		: undefined

	const result = await updateGameDeathCount(gameName, deaths, {
		counterName,
		metadata: {
			twitchGameId,
			boxArtUrl,
		},
	})

	return {
		id: result.game.id,
		gameName: result.game.name,
		twitchGameId: result.game.twitchGameId,
		boxArtUrl: result.game.boxArtUrl,
		deaths: result.targetCounter.deaths,
		totalDeaths: result.totalDeaths,
		counterName: result.targetCounter.name,
	}
})
