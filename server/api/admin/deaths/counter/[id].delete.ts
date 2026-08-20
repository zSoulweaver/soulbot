import { eq, sql } from 'drizzle-orm'
import { botEventBus } from '~~/server/bot/core/events'
import { clearDeathsCache } from '~~/server/bot/modules/deaths/utils'
import { db } from '~~/server/database'
import { gameDeathCounters, games } from '~~/server/database/schema'
import { requireUserRole } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')
	const idParam = getRouterParam(event, 'id')
	const id = Number(idParam)

	if (!id || Number.isNaN(id)) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid counter ID',
		})
	}

	const counter = await db.query.gameDeathCounters.findFirst({
		where: eq(gameDeathCounters.id, id),
	})

	if (!counter) {
		throw createError({
			statusCode: 404,
			statusMessage: 'Counter not found',
		})
	}

	const game = await db.query.games.findFirst({
		where: eq(games.id, counter.gameId),
	})

	await db.delete(gameDeathCounters).where(eq(gameDeathCounters.id, id))

	if (game) {
		// If we deleted the active counter or the only counter, ensure there is still a valid active counter
		const remaining = await db.select().from(gameDeathCounters).where(eq(gameDeathCounters.gameId, game.id))
		let newActiveId = game.activeDeathCounterId

		if (remaining.length === 0) {
			const [created] = await db.insert(gameDeathCounters).values({
				gameId: game.id,
				name: 'Default',
				deaths: 0,
			}).returning()
			newActiveId = created ? created.id : null
		}
		else if (game.activeDeathCounterId === id) {
			newActiveId = remaining[0]?.id || null
		}

		await db.update(games)
			.set({
				activeDeathCounterId: newActiveId,
				updatedAt: sql`(strftime('%s', 'now'))`,
			})
			.where(eq(games.id, game.id))

		const finalCounters = await db.select().from(gameDeathCounters).where(eq(gameDeathCounters.gameId, game.id))
		const totalDeaths = finalCounters.reduce((sum, c) => sum + c.deaths, 0)

		botEventBus.emit('deaths:updated', {
			gameName: game.name,
			counterName: finalCounters.find(c => c.id === newActiveId)?.name || 'Default',
			deaths: finalCounters.find(c => c.id === newActiveId)?.deaths || 0,
			totalDeaths,
		})
	}

	await clearDeathsCache()
	return { success: true }
})
