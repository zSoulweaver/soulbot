import type { CommandMiddleware } from '../types'
import { and, eq, gte, sql } from 'drizzle-orm'
import { db } from '~~/server/database'
import { users } from '~~/server/database/schema'
import { botLogger } from '~~/server/utils/logger'

/**
 * Validates that the sender has sufficient points before execution, and deducts them post-execution on success.
 */
export const pointsCostMiddleware: CommandMiddleware = async (ctx, next) => {
	if ((ctx.raw as any).isTimer) {
		await next()
		return
	}

	const dbCmd = ctx.state.dbCmd
	const cost = dbCmd?.cost ?? 0

	if (cost > 0) {
		const [dbUser] = await db.select().from(users).where(eq(users.id, ctx.user.id))
		if (!dbUser || dbUser.points < cost) {
			botLogger.info({
				command: ctx.state.trigger,
				user: ctx.user.name,
				userId: ctx.user.id,
				cost,
				currentPoints: dbUser?.points || 0,
			}, 'Command rejected due to insufficient points')
			return ctx.reply(`You need ${cost} points to use this command.`)
		}
	}

	await next()

	// Atomically deduct points after successful downstream execution
	if (cost > 0 && ctx.state.success !== false) {
		const [updated] = await db.update(users)
			.set({
				points: sql`MAX(0, ${users.points} - ${cost})`,
				updatedAt: new Date(),
			})
			.where(and(eq(users.id, ctx.user.id), gte(users.points, cost)))
			.returning()

		if (!updated) {
			botLogger.warn({
				command: ctx.state.trigger,
				userId: ctx.user.id,
				cost,
			}, 'Command post-deduction skipped because points were spent concurrently')
		}
	}
}
