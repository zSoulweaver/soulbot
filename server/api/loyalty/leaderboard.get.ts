import { desc } from 'drizzle-orm'
import { db } from '../../database'
import { users } from '../../database/schema'

export default defineEventHandler(async () => {
	const leaderboard = await db
		.select({
			id: users.id,
			username: users.username,
			displayName: users.displayName,
			points: users.points,
		})
		.from(users)
		.orderBy(desc(users.points))
		.limit(100)

	return leaderboard
})
