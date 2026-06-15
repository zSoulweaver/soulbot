import { eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { users } from '~~/server/database/schema'
import { getUserRecord } from '../../services/user'

export async function getUserWatchTime(username: string) {
	const dbUser = await getUserRecord(username)
	return dbUser?.watchTime ?? null
}

export async function updateUserWatchTime(username: string, amount: number, mode: 'add' | 'set' = 'add') {
	const dbUser = await getUserRecord(username)
	if (!dbUser) {
		return null
	}

	const newAmount = mode === 'add' ? Math.max(0, dbUser.watchTime + amount) : Math.max(0, amount)

	await db.update(users)
		.set({ watchTime: newAmount })
		.where(eq(users.id, dbUser.id))

	return {
		...dbUser,
		watchTime: newAmount,
	}
}
