import type { CommandHandler } from '../../../core/types'
import type { PointsArgs } from '../schema'
import { eq } from 'drizzle-orm'
import { db } from '../../../../database'
import { users } from '../../../../database/schema'

export const handlePointsRoot: CommandHandler<typeof PointsArgs> = async (ctx, [target]) => {
	const username = target || ctx.user.name
	const [dbUser] = await db.select().from(users).where(eq(users.username, username.toLowerCase()))

	if (!dbUser) {
		if (target) {
			return ctx.reply('points.user-no-points', { target: username })
		}
		return ctx.reply('points.user-no-points-self')
	}

	if (target) {
		return ctx.reply('points.show', {
			target: username,
			amount: dbUser.points,
		})
	}

	ctx.reply('points.show-self', {
		amount: dbUser.points,
	})
}
