import { desc, eq, inArray, sql } from 'drizzle-orm'
import { getCurrentGameName } from '~~/server/bot/modules/deaths/utils'
import { db } from '~~/server/database'
import { gameDeathCounters, games } from '~~/server/database/schema'
import { buildPaginationMeta, parsePaginationParams } from '~~/server/utils/pagination'
import { getApiClient, getStreamerToken } from '~~/server/utils/twurple'

export default defineCachedEventHandler(async (event) => {
	const { page, limit, search } = parsePaginationParams(event)

	const currentGame = await getCurrentGameName()
	let isLive = false

	try {
		const streamerToken = await getStreamerToken()
		if (streamerToken?.userId) {
			const api = getApiClient()
			const stream = await api.streams.getStreamByUserId(streamerToken.userId)
			if (stream) {
				isLive = true
			}
		}
	}
	catch {
		// Ignore API errors for public endpoint
	}

	// Fetch all games with their calculated total deaths (> 0)
	const allRankedGames = await db
		.select({
			id: games.id,
			name: games.name,
			twitchGameId: games.twitchGameId,
			boxArtUrl: games.boxArtUrl,
			activeDeathCounterId: games.activeDeathCounterId,
			createdAt: games.createdAt,
			updatedAt: games.updatedAt,
			totalDeaths: sql<number>`CAST(COALESCE(SUM(${gameDeathCounters.deaths}), 0) AS INTEGER)`,
		})
		.from(games)
		.leftJoin(gameDeathCounters, eq(gameDeathCounters.gameId, games.id))
		.groupBy(games.id)
		.having(sql`COALESCE(SUM(${gameDeathCounters.deaths}), 0) > 0`)
		.orderBy(
			desc(sql`COALESCE(SUM(${gameDeathCounters.deaths}), 0)`),
			desc(games.updatedAt),
		)

	// Attach overall ranks (1-indexed based on full dataset)
	const rankedWithPositions = allRankedGames.map((game, index) => ({
		...game,
		rank: index + 1,
	}))

	// Featured current game lookup
	let featuredGame = null
	const currentFeatured = rankedWithPositions.find(
		g => g.name.toLowerCase() === currentGame.toLowerCase(),
	)

	if (currentFeatured) {
		const featuredCounters = await db
			.select()
			.from(gameDeathCounters)
			.where(eq(gameDeathCounters.gameId, currentFeatured.id))
			.orderBy(desc(gameDeathCounters.deaths))

		const activeCounter = featuredCounters.find(c => c.id === currentFeatured.activeDeathCounterId) || featuredCounters[0]

		featuredGame = {
			id: currentFeatured.id,
			gameName: currentFeatured.name,
			twitchGameId: currentFeatured.twitchGameId,
			boxArtUrl: currentFeatured.boxArtUrl,
			deaths: currentFeatured.totalDeaths,
			totalDeaths: currentFeatured.totalDeaths,
			activeDeathCounterId: currentFeatured.activeDeathCounterId,
			activeCounterName: activeCounter?.name || 'Default',
			activeCounterDeaths: activeCounter?.deaths || 0,
			rank: currentFeatured.rank,
			isCurrentGame: true,
			counters: featuredCounters.map(c => ({
				id: c.id,
				name: c.name,
				deaths: c.deaths,
				isActive: c.id === currentFeatured.activeDeathCounterId,
			})),
			createdAt: currentFeatured.createdAt,
			updatedAt: currentFeatured.updatedAt,
		}
	}

	// Apply search filtering for paginated table
	const searchLower = search ? search.trim().toLowerCase() : ''
	const filteredGames = searchLower
		? rankedWithPositions.filter(g => g.name.toLowerCase().includes(searchLower))
		: rankedWithPositions

	const totalCount = filteredGames.length
	const pagedGames = filteredGames.slice((page - 1) * limit, page * limit)

	// Fetch sub-counters for the paged games
	const pagedGameIds = pagedGames.map(g => g.id)
	const pagedCounters = pagedGameIds.length > 0
		? await db
				.select()
				.from(gameDeathCounters)
				.where(inArray(gameDeathCounters.gameId, pagedGameIds))
				.orderBy(desc(gameDeathCounters.deaths))
		: []

	const data = pagedGames.map((game) => {
		const gameCounters = pagedCounters.filter(c => c.gameId === game.id)
		const activeCounter = gameCounters.find(c => c.id === game.activeDeathCounterId) || gameCounters[0]

		return {
			id: game.id,
			gameName: game.name,
			twitchGameId: game.twitchGameId,
			boxArtUrl: game.boxArtUrl,
			deaths: game.totalDeaths,
			totalDeaths: game.totalDeaths,
			activeDeathCounterId: game.activeDeathCounterId,
			activeCounterName: activeCounter?.name || 'Default',
			activeCounterDeaths: activeCounter?.deaths || 0,
			rank: game.rank,
			isCurrentGame: game.name.toLowerCase() === currentGame.toLowerCase(),
			counters: gameCounters.map(c => ({
				id: c.id,
				name: c.name,
				deaths: c.deaths,
				isActive: c.id === game.activeDeathCounterId,
			})),
			createdAt: game.createdAt,
			updatedAt: game.updatedAt,
		}
	})

	return {
		currentGame,
		isLive,
		featuredGame,
		data,
		meta: buildPaginationMeta(totalCount, page, limit),
	}
}, {
	maxAge: 30,
	swr: false,
	name: 'deaths-leaderboard',
	getKey: (event) => {
		const query = getQuery(event)
		const page = query.page || 1
		const limit = query.limit || 10
		const search = (query.search || '').toString().trim().toLowerCase()
		return `${page}-${limit}-${search}`
	},
})
