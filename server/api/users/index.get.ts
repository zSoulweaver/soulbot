import { desc, like } from 'drizzle-orm'
import { db } from '../../database'
import { users } from '../../database/schema'

export default defineEventHandler(async (event) => {
	const query = getQuery(event)
	const search = query.q as string | undefined

	let dbQuery = db.select().from(users).$dynamic()

	if (search) {
		dbQuery = dbQuery.where(like(users.username, `%${search.toLowerCase()}%`))
	}

	const allUsers = await dbQuery.orderBy(desc(users.points)).limit(500)

	return allUsers
})
