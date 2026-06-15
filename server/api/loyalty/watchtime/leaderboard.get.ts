import { desc } from 'drizzle-orm'
import { db } from '../../../database'
import { users } from '../../../database/schema'

export default defineEventHandler(async () => {
	const leaderboard = await db
		.select({
			id: users.id,
			username: users.username,
			displayName: users.displayName,
			watchTime: users.watchTime,
		})
		.from(users)
		.orderBy(desc(users.watchTime))
		.limit(100)

	return leaderboard
})
