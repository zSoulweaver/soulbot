import { and, desc, notInArray } from 'drizzle-orm'
import { getBotToken } from '~~/server/utils/twurple'
import { db } from '../../database'
import { excludedUsers, users } from '../../database/schema'

export default defineCachedEventHandler(async () => {
	const excludedList = await db.select({ id: excludedUsers.id }).from(excludedUsers)
	const excludedIds = excludedList.map(u => u.id).filter(Boolean) as string[]

	const botToken = await getBotToken()
	if (botToken?.userId) {
		excludedIds.push(botToken.userId)
	}

	const conditions = []
	if (excludedIds.length > 0) {
		conditions.push(notInArray(users.id, excludedIds))
	}

	const leaderboard = await db
		.select({
			id: users.id,
			username: users.username,
			displayName: users.displayName,
			points: users.points,
		})
		.from(users)
		.where(conditions.length > 0 ? and(...conditions) : undefined)
		.orderBy(desc(users.points))
		.limit(100)

	return leaderboard
}, {
	maxAge: 30,
	swr: false,
	name: 'loyalty-leaderboard',
	getKey: () => 'default',
})
