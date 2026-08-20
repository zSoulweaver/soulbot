import { eq, sql } from 'drizzle-orm'
import { botEventBus } from '~~/server/bot/core/events'
import { clearDeathsCache } from '~~/server/bot/modules/deaths/utils'
import { db } from '~~/server/database'
import { gameDeathCounters, games } from '~~/server/database/schema'
import { requireUserRole } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')
	const body = await readBody(event)

	if (!body || !body.gameId || !body.counterId) {
		throw createError({
			statusCode: 400,
			statusMessage: 'gameId and counterId are required',
		})
	}

	const gameId = Number(body.gameId)
	const counterId = Number(body.counterId)

	const game = await db.query.games.findFirst({
		where: eq(games.id, gameId),
	})

	if (!game) {
		throw createError({
			statusCode: 404,
			statusMessage: 'Game not found',
		})
	}

	const counter = await db.query.gameDeathCounters.findFirst({
		where: eq(gameDeathCounters.id, counterId),
	})

	if (!counter || counter.gameId !== gameId) {
		throw createError({
			statusCode: 404,
			statusMessage: 'Counter not found for this game',
		})
	}

	const [updatedGame] = await db.update(games)
		.set({
			activeDeathCounterId: counter.id,
			updatedAt: sql`(strftime('%s', 'now'))`,
		})
		.where(eq(games.id, gameId))
		.returning()

	const allCounters = await db.select().from(gameDeathCounters).where(eq(gameDeathCounters.gameId, gameId))
	const totalDeaths = allCounters.reduce((sum, c) => sum + c.deaths, 0)

	botEventBus.emit('deaths:updated', {
		gameName: game.name,
		counterName: counter.name,
		deaths: counter.deaths,
		totalDeaths,
	})

	await clearDeathsCache()

	return {
		game: updatedGame,
		activeCounter: counter,
		totalDeaths,
	}
})
