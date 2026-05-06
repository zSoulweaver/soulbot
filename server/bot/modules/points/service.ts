import { eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { users } from '~~/server/database/schema'

export async function getUserRecord(username: string) {
	username = username.toLowerCase().replace('@', '')
	let [dbUser] = await db.select().from(users).where(eq(users.username, username))

	if (!dbUser) {
		const api = getApiClient()
		const twitchUser = await api.users.getUserByName(username)

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

export async function getUserPoints(username: string) {
	const dbUser = await getUserRecord(username)
	return dbUser?.points ?? null
}

export async function updateUserPoints(username: string, amount: number, mode: 'add' | 'set' = 'add') {
	const dbUser = await getUserRecord(username)
	if (!dbUser) {
		return null
	}

	const newAmount = mode === 'add' ? dbUser.points + amount : amount

	await db.update(users)
		.set({ points: newAmount })
		.where(eq(users.id, dbUser.id))

	return {
		...dbUser,
		points: newAmount,
	}
}
