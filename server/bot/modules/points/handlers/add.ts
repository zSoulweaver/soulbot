import type { CommandHandler } from '../../../core/types'
import type { PointsAddArgs } from '../schema'
import { eq, sql } from 'drizzle-orm'
import { db } from '../../../../database'
import { users } from '../../../../database/schema'

export const handlePointsAdd: CommandHandler<typeof PointsAddArgs> = async (ctx, [target, amount]) => {
	// 1. Try to find the user by lowercase username
	const [dbUser] = await db.select().from(users).where(eq(users.username, target.toLowerCase()))

	if (!dbUser) {
		return ctx.reply('points.user-not-found', { target })
	}

	await db.update(users)
		.set({ points: sql`${users.points} + ${amount}` })
		.where(eq(users.id, dbUser.id))

	ctx.reply('points.add', {
		amount,
		target,
		newAmount: dbUser.points + amount,
	})
}
