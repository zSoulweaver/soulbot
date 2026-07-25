import { eq, sql } from 'drizzle-orm'
import { db } from '~~/server/database'
import { gameDeaths } from '~~/server/database/schema'
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

	if (body.id) {
		const [updated] = await db
			.update(gameDeaths)
			.set({
				gameName,
				deaths,
				updatedAt: sql`(strftime('%s', 'now'))`,
			})
			.where(eq(gameDeaths.id, Number(body.id)))
			.returning()

		return updated
	}

	const existing = await db.query.gameDeaths.findFirst({
		where: eq(gameDeaths.gameName, gameName),
	})

	if (existing) {
		const [updated] = await db
			.update(gameDeaths)
			.set({
				deaths,
				updatedAt: sql`(strftime('%s', 'now'))`,
			})
			.where(eq(gameDeaths.id, existing.id))
			.returning()

		return updated
	}

	const [created] = await db
		.insert(gameDeaths)
		.values({
			gameName,
			deaths,
		})
		.returning()

	return created
})
