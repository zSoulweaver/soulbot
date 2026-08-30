import { and, asc, desc, gt, gte, lt, sql } from 'drizzle-orm'
import { db } from '~~/server/database'
import { users } from '~~/server/database/schema'

// Public route - leaderboard lookup bypasses role verification
export default defineCachedEventHandler(async () => {
	const k = 5.0

	// 1. Top 10 Gainers (net points > 0)
	const topGainersRaw = await db
		.select({
			id: users.id,
			username: users.username,
			displayName: users.displayName,
			image: users.image,
			gambleWins: users.gambleWins,
			gambleLosses: users.gambleLosses,
			gambleNetPoints: users.gambleNetPoints,
		})
		.from(users)
		.where(gt(users.gambleNetPoints, 0))
		.orderBy(desc(users.gambleNetPoints))
		.limit(10)

	// 2. Bottom 10 Losers (net points < 0, ordered ascending - most lost first)
	const topLosersRaw = await db
		.select({
			id: users.id,
			username: users.username,
			displayName: users.displayName,
			image: users.image,
			gambleWins: users.gambleWins,
			gambleLosses: users.gambleLosses,
			gambleNetPoints: users.gambleNetPoints,
		})
		.from(users)
		.where(lt(users.gambleNetPoints, 0))
		.orderBy(asc(users.gambleNetPoints))
		.limit(10)

	// 3. Top 10 Luckiest (total >= 3, sorted by Bayesian Win Rate descending)
	const luckiestRaw = await db
		.select({
			id: users.id,
			username: users.username,
			displayName: users.displayName,
			image: users.image,
			gambleWins: users.gambleWins,
			gambleLosses: users.gambleLosses,
			gambleNetPoints: users.gambleNetPoints,
		})
		.from(users)
		.where(and(
			gt(sql`${users.gambleWins} + ${users.gambleLosses}`, 0),
			gte(sql`${users.gambleWins} + ${users.gambleLosses}`, 3),
		))
		.orderBy(desc(sql`(${users.gambleWins} + ${k * 0.5}) * 1.0 / (${users.gambleWins} + ${users.gambleLosses} + ${k})`))
		.limit(10)

	// 4. Top 10 Unluckiest (total >= 3, sorted by Bayesian Win Rate ascending)
	const unluckiestRaw = await db
		.select({
			id: users.id,
			username: users.username,
			displayName: users.displayName,
			image: users.image,
			gambleWins: users.gambleWins,
			gambleLosses: users.gambleLosses,
			gambleNetPoints: users.gambleNetPoints,
		})
		.from(users)
		.where(and(
			gt(sql`${users.gambleWins} + ${users.gambleLosses}`, 0),
			gte(sql`${users.gambleWins} + ${users.gambleLosses}`, 3),
		))
		.orderBy(asc(sql`(${users.gambleWins} + ${k * 0.5}) * 1.0 / (${users.gambleWins} + ${users.gambleLosses} + ${k})`))
		.limit(10)

	const mapUser = (u: typeof topGainersRaw[number]) => {
		const total = u.gambleWins + u.gambleLosses
		return {
			...u,
			totalGambles: total,
			winRate: total > 0 ? Math.round((u.gambleWins / total) * 100) : 0,
		}
	}

	return {
		topGainers: topGainersRaw.map(mapUser),
		topLosers: topLosersRaw.map(mapUser),
		luckiest: luckiestRaw.map(mapUser),
		unluckiest: unluckiestRaw.map(mapUser),
	}
}, {
	maxAge: 30,
	swr: false,
	name: 'gambling-leaderboard',
	getKey: () => 'default',
})
