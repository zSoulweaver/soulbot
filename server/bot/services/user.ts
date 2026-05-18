import { eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { users } from '~~/server/database/schema'
import { getApiClient } from '~~/server/utils/twurple'
import { cleanUsername, getCachedTwitchUser, setCachedTwitchUser } from '../core/utils'

/**
 * Shared generic service to retrieve or create a user record.
 * Leverages local database records, and falls back to our Helix cache / Twitch API.
 */
export async function getUserRecord(username: string) {
	const cleaned = cleanUsername(username)
	let [dbUser] = await db.select().from(users).where(eq(users.username, cleaned))

	if (!dbUser) {
		// Check the Twitch API user lookup cache first
		let twitchUser = getCachedTwitchUser(cleaned)

		if (twitchUser === undefined) {
			const api = getApiClient()
			twitchUser = await api.users.getUserByName(cleaned)
			setCachedTwitchUser(cleaned, twitchUser)
		}

		if (!twitchUser) {
			return null
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

	return dbUser
}
