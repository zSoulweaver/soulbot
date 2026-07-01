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

export async function updateUserPointsAndGambleStats(username: string, pointsDiff: number, isWin: boolean) {
	const dbUser = await getUserRecord(username)
	if (!dbUser) {
		return null
	}

	const newPoints = dbUser.points + pointsDiff
	const newWins = dbUser.gambleWins + (isWin ? 1 : 0)
	const newLosses = dbUser.gambleLosses + (isWin ? 0 : 1)
	const newNet = dbUser.gambleNetPoints + pointsDiff

	await db.update(users)
		.set({
			points: newPoints,
			gambleWins: newWins,
			gambleLosses: newLosses,
			gambleNetPoints: newNet,
		})
		.where(eq(users.id, dbUser.id))

	return {
		...dbUser,
		points: newPoints,
		gambleWins: newWins,
		gambleLosses: newLosses,
		gambleNetPoints: newNet,
	}
}

export async function transferPoints(senderUsername: string, targetUsername: string, amount: number) {
	const dbSender = await getUserRecord(senderUsername)
	const dbTarget = await getUserRecord(targetUsername)

	if (!dbSender) {
		return { success: false, error: 'sender-not-found' } as const
	}
	if (!dbTarget) {
		return { success: false, error: 'target-not-found' } as const
	}

	if (dbSender.points < amount) {
		return { success: false, error: 'not-enough-points', senderPoints: dbSender.points } as const
	}

	const newSenderPoints = dbSender.points - amount
	const newTargetPoints = dbTarget.points + amount

	db.transaction((tx) => {
		tx.update(users)
			.set({ points: newSenderPoints })
			.where(eq(users.id, dbSender.id))
			.run()

		tx.update(users)
			.set({ points: newTargetPoints })
			.where(eq(users.id, dbTarget.id))
			.run()
	})

	return {
		success: true,
		sender: {
			...dbSender,
			points: newSenderPoints,
		},
		target: {
			...dbTarget,
			points: newTargetPoints,
		},
	} as const
}
