import type { CommandHandler } from '../../../core/types'
import type { PointsAddArgs } from '../schema'
import { eq, sql } from 'drizzle-orm'
import { db } from '../../../../database'
import { users } from '../../../../database/schema'
import { getApiClient } from '../../../../utils/twurple'

export const handlePointsAdd: CommandHandler<typeof PointsAddArgs> = async (ctx, [target, amount]) => {
	const username = target.toLowerCase().replace('@', '')

	let [dbUser] = await db.select().from(users).where(eq(users.username, username))
	if (!dbUser) {
		const api = getApiClient()
		const twitchUser = await api.users.getUserByName(username)

		if (!twitchUser) {
			return ctx.reply('points.user-does-not-exist', { target })
		}

		const [newUser] = await db.insert(users).values({
			id: twitchUser.id,
			username: twitchUser.name,
			displayName: twitchUser.displayName,
			points: 0,
			firstSeen: Date.now(),
			lastSeen: Date.now(),
		}).returning()

		dbUser = newUser
	}

	if (!dbUser) {
		return
	}

	await db.update(users)
		.set({ points: sql`${users.points} + ${amount}` })
		.where(eq(users.id, dbUser.id))

	ctx.reply('points.add', {
		amount,
		target: dbUser.displayName,
		newAmount: dbUser.points + amount,
	})
}
