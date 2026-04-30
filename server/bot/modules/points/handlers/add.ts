import type { CommandHandler } from '../../../core/types'
import type { PointsAddArgs } from '../schema'
import { eq, sql } from 'drizzle-orm'
import { db } from '../../../../database'
import { users } from '../../../../database/schema'

export const handlePointsAdd: CommandHandler<typeof PointsAddArgs> = async (ctx, [target, amount]) => {
	// 1. Try to find the user by lowercase username
	const [dbUser] = await db.select().from(users).where(eq(users.username, target.toLowerCase()))

	if (!dbUser) {
		// If they don't exist in the DB yet, we can't add points unless we have their Twitch ID.
		// For a production bot, we would usually resolve the ID via Twurple API or wait until they chat.
		return ctx.reply(`User ${target} hasn't been seen by the bot yet.`)
	}

	await db.update(users)
		.set({ points: sql`${users.points} + ${amount}` })
		.where(eq(users.id, dbUser.id))

	ctx.reply(`Added ${amount} points to ${target}. They now have ${dbUser.points + amount} points.`)
}
