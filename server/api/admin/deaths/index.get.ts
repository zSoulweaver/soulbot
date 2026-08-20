import { desc, eq, inArray, like, sql } from 'drizzle-orm'
import { getCurrentGameName } from '~~/server/bot/modules/deaths/utils'
import { db } from '~~/server/database'
import { gameDeathCounters, games } from '~~/server/database/schema'
import { requireUserRole } from '~~/server/utils/auth'
import { buildPaginationMeta, parsePaginationParams } from '~~/server/utils/pagination'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')
	const { page, limit, search } = parsePaginationParams(event)

	const searchCondition = search
		? like(sql`LOWER(${games.name})`, `%${search.toLowerCase()}%`)
		: undefined

	const countRes = await db
		.select({ count: sql<number>`count(*)` })
		.from(games)
		.where(searchCondition)
	const totalCount = countRes[0]?.count || 0

	// Fetch paged games with total deaths
	const pagedGames = await db
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
		.where(searchCondition)
		.groupBy(games.id)
		.orderBy(desc(games.updatedAt))
		.limit(limit)
		.offset((page - 1) * limit)

	const pagedGameIds = pagedGames.map(g => g.id)
	const countersList = pagedGameIds.length > 0
		? await db
				.select()
				.from(gameDeathCounters)
				.where(inArray(gameDeathCounters.gameId, pagedGameIds))
				.orderBy(desc(gameDeathCounters.updatedAt))
		: []

	const items = pagedGames.map((game) => {
		const gameCounters = countersList.filter(c => c.gameId === game.id)
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
			counters: gameCounters.map(c => ({
				id: c.id,
				gameId: c.gameId,
				name: c.name,
				deaths: c.deaths,
				isActive: c.id === game.activeDeathCounterId,
				createdAt: c.createdAt,
				updatedAt: c.updatedAt,
			})),
			createdAt: game.createdAt,
			updatedAt: game.updatedAt,
		}
	})

	const currentGame = await getCurrentGameName()

	return {
		data: items,
		currentGame,
		meta: buildPaginationMeta(totalCount, page, limit),
	}
})
