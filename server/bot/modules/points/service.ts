import { and, eq, gte, sql } from 'drizzle-orm'
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

	const now = new Date()

	if (mode === 'set') {
		const [updated] = await db
			.update(users)
			.set({
				points: Math.max(0, Math.floor(amount)),
				updatedAt: now,
			})
			.where(eq(users.id, dbUser.id))
			.returning()

		return updated ?? null
	}

	// mode === 'add'
	if (amount >= 0) {
		const [updated] = await db
			.update(users)
			.set({
				points: sql`${users.points} + ${Math.floor(amount)}`,
				updatedAt: now,
			})
			.where(eq(users.id, dbUser.id))
			.returning()

		return updated ?? null
	}
	else {
		const cost = Math.abs(Math.floor(amount))
		const [updated] = await db
			.update(users)
			.set({
				points: sql`${users.points} - ${cost}`,
				updatedAt: now,
			})
			.where(and(eq(users.id, dbUser.id), gte(users.points, cost)))
			.returning()

		return updated ?? null
	}
}

export async function updateUserPointsAndGambleStats(username: string, pointsDiff: number, isWin: boolean) {
	const dbUser = await getUserRecord(username)
	if (!dbUser) {
		return null
	}

	const now = new Date()

	if (isWin) {
		const winGain = Math.max(0, Math.floor(pointsDiff))
		const [updated] = await db
			.update(users)
			.set({
				points: sql`${users.points} + ${winGain}`,
				gambleWins: sql`${users.gambleWins} + 1`,
				gambleNetPoints: sql`${users.gambleNetPoints} + ${winGain}`,
				updatedAt: now,
			})
			.where(eq(users.id, dbUser.id))
			.returning()

		return updated ?? null
	}
	else {
		const lossAmount = Math.abs(Math.floor(pointsDiff))
		const [updated] = await db
			.update(users)
			.set({
				points: sql`MAX(0, ${users.points} - ${lossAmount})`,
				gambleLosses: sql`${users.gambleLosses} + 1`,
				gambleNetPoints: sql`${users.gambleNetPoints} - ${lossAmount}`,
				updatedAt: now,
			})
			.where(eq(users.id, dbUser.id))
			.returning()

		return updated ?? null
	}
}

export async function transferPoints(senderUsername: string, targetUsername: string, amount: number) {
	if (amount <= 0 || !Number.isInteger(amount)) {
		return { success: false, error: 'invalid-amount' } as const
	}

	const dbSender = await getUserRecord(senderUsername)
	const dbTarget = await getUserRecord(targetUsername)

	if (!dbSender) {
		return { success: false, error: 'sender-not-found' } as const
	}
	if (!dbTarget) {
		return { success: false, error: 'target-not-found' } as const
	}

	const now = new Date()

	return db.transaction((tx) => {
		// Atomic deduction from sender ONLY IF they currently have sufficient points
		const [senderUpdate] = tx
			.update(users)
			.set({
				points: sql`${users.points} - ${amount}`,
				updatedAt: now,
			})
			.where(and(eq(users.id, dbSender.id), gte(users.points, amount)))
			.returning()
			.all()

		if (!senderUpdate) {
			return { success: false, error: 'not-enough-points', senderPoints: dbSender.points } as const
		}

		// Atomic addition to target
		const [targetUpdate] = tx
			.update(users)
			.set({
				points: sql`${users.points} + ${amount}`,
				updatedAt: now,
			})
			.where(eq(users.id, dbTarget.id))
			.returning()
			.all()

		return {
			success: true,
			sender: senderUpdate,
			target: targetUpdate || { ...dbTarget, points: dbTarget.points + amount },
		} as const
	})
}
