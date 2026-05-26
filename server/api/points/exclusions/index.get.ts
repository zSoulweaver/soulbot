import { eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { excludedUsers, twitchTokens } from '~~/server/database/schema'
import { requireUserRole } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')

	const manual = await db.select().from(excludedUsers)

	const botToken = await db
		.select()
		.from(twitchTokens)
		.where(eq(twitchTokens.accountType, 'bot'))
		.then(res => res[0])

	const autoExclusions = []
	if (botToken) {
		autoExclusions.push({
			username: botToken.userName,
			displayName: botToken.displayName,
		})
	}

	return {
		manualExclusions: manual,
		autoExclusions,
	}
})
