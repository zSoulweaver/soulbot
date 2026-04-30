import type { CommandHandler } from '../../../core/types'
import type { PointsArgs } from '../schema'
import { eq } from 'drizzle-orm'
import { db } from '../../../../database'
import { users } from '../../../../database/schema'

export const handlePointsRoot: CommandHandler<typeof PointsArgs> = async (ctx, [target]) => {
	const username = target || ctx.user.name
	const [dbUser] = await db.select().from(users).where(eq(users.username, username.toLowerCase()))

	if (!dbUser) {
		return ctx.reply(`${username} hasn't earned any points yet.`)
	}

	ctx.reply(`${username} has ${dbUser.points} points.`)
}
