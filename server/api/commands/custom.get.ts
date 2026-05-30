import { asc } from 'drizzle-orm'
import { db } from '~~/server/database'
import { customCommands } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')

	return await db.select()
		.from(customCommands)
		.orderBy(asc(customCommands.trigger))
})
