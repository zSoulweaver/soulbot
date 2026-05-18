import { eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { users } from '~~/server/database/schema'
import { getUserRecord } from '../../services/user'

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
