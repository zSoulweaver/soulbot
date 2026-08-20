import { eq, sql } from 'drizzle-orm'
import { botEventBus } from '~~/server/bot/core/events'
import { clearDeathsCache } from '~~/server/bot/modules/deaths/utils'
import { db } from '~~/server/database'
import { gameDeathCounters, games } from '~~/server/database/schema'
import { requireUserRole } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')
	const body = await readBody(event)

	if (!body || !body.gameId || !body.name || typeof body.name !== 'string' || !body.name.trim()) {
		throw createError({
			statusCode: 400,
			statusMessage: 'gameId and counter name are required',
		})
	}

	const gameId = Number(body.gameId)
	const counterId = body.counterId ? Number(body.counterId) : undefined
	const name = body.name.trim()
	const deaths = Math.max(0, Math.floor(Number(body.deaths) || 0))
	const setActive = Boolean(body.setActive)

	const game = await db.query.games.findFirst({
		where: eq(games.id, gameId),
	})

	if (!game) {
		throw createError({
			statusCode: 404,
			statusMessage: 'Game not found',
		})
	}

	let counterRecord
	if (counterId) {
		const [updated] = await db.update(gameDeathCounters)
			.set({
				name,
				deaths,
				updatedAt: sql`(strftime('%s', 'now'))`,
			})
			.where(eq(gameDeathCounters.id, counterId))
			.returning()
		counterRecord = updated
	}
	else {
		const [created] = await db.insert(gameDeathCounters).values({
			gameId,
			name,
			deaths,
		}).returning()
		counterRecord = created
	}

	if (!counterRecord) {
		throw createError({
			statusCode: 500,
			statusMessage: 'Failed to create or update counter',
		})
	}

	if (setActive) {
		await db.update(games)
			.set({
				activeDeathCounterId: counterRecord.id,
				updatedAt: sql`(strftime('%s', 'now'))`,
			})
			.where(eq(games.id, gameId))
	}
	else {
		await db.update(games)
			.set({
				updatedAt: sql`(strftime('%s', 'now'))`,
			})
			.where(eq(games.id, gameId))
	}

	const allCounters = await db.select().from(gameDeathCounters).where(eq(gameDeathCounters.gameId, gameId))
	const totalDeaths = allCounters.reduce((sum, c) => sum + c.deaths, 0)

	botEventBus.emit('deaths:updated', {
		gameName: game.name,
		counterName: counterRecord.name,
		deaths: counterRecord.deaths,
		totalDeaths,
	})

	await clearDeathsCache()

	return {
		counter: counterRecord,
		totalDeaths,
	}
})
