import type { CommandHandler } from '~~/server/bot/core/types'
import type { PointsArgs } from '../schema'
import { and, gt, notInArray, sql } from 'drizzle-orm'
import { cleanUsername } from '~~/server/bot/core/utils'
import { getUserRecord } from '~~/server/bot/services/user'
import { db } from '~~/server/database'
import { excludedUsers, users } from '~~/server/database/schema'
import { getBotToken } from '~~/server/utils/twurple'

export const handlePointsRoot: CommandHandler<typeof PointsArgs> = async (ctx, [target]) => {
	const username = cleanUsername(target || ctx.user.name)
	const dbUser = await getUserRecord(username)

	if (!dbUser) {
		if (target) {
			return ctx.reply('points.user-no-points', { target: username })
		}
		return ctx.reply('points.user-no-points-self')
	}

	// Calculate leaderboard rank (number of non-excluded users with more points, plus 1)
	const excludedList = await db.select({ id: excludedUsers.id }).from(excludedUsers)
	const excludedIds = excludedList.map(u => u.id).filter(Boolean) as string[]

	const botToken = await getBotToken()
	if (botToken?.userId) {
		excludedIds.push(botToken.userId)
	}

	const conditions = [
		gt(users.points, dbUser.points),
	]
	if (excludedIds.length > 0) {
		conditions.push(notInArray(users.id, excludedIds))
	}

	const [rankRes] = await db
		.select({ count: sql<number>`count(*)` })
		.from(users)
		.where(and(...conditions))
	const leaderboardRank = (rankRes?.count ?? 0) + 1

	if (target) {
		return ctx.reply('points.show', {
			target: username,
			amount: dbUser.points,
			leaderboardRank,
		})
	}

	ctx.reply('points.show-self', {
		amount: dbUser.points,
		leaderboardRank,
	})
}
