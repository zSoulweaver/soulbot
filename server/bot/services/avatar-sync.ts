import { and, desc, eq, gt, lt, notInArray } from 'drizzle-orm'
import { db } from '~~/server/database'
import { excludedUsers, users } from '~~/server/database/schema'
import { botLogger } from '~~/server/utils/logger'
import { getApiClient, getBotToken, getStreamerToken } from '~~/server/utils/twurple'
import { cleanUsername } from '../core/utils'

let missingCheckIntervalId: NodeJS.Timeout | null = null
let fullRefreshIntervalId: NodeJS.Timeout | null = null

const MISSING_CHECK_INTERVAL_MS = 10 * 60 * 1000 // 10 minutes
const FULL_REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000 // 6 hours

export interface LeaderboardUserEntry {
	id: string
	image: string | null
}

/**
 * Gathers unique user IDs for all top leaderboard chatters across points, watch time, and gambling.
 */
export async function getTopLeaderboardUsers(): Promise<LeaderboardUserEntry[]> {
	const excludedList = await db.select({ id: excludedUsers.id }).from(excludedUsers)
	const excludedIds = excludedList.map(u => u.id).filter(Boolean) as string[]

	const botToken = await getBotToken()
	if (botToken?.userId) {
		excludedIds.push(botToken.userId)
	}

	const baseConditions = []
	if (excludedIds.length > 0) {
		baseConditions.push(notInArray(users.id, excludedIds))
	}

	// 1. Points Leaderboard (Top 100)
	const topPoints = await db
		.select({
			id: users.id,
			image: users.image,
		})
		.from(users)
		.where(baseConditions.length > 0 ? and(...baseConditions) : undefined)
		.orderBy(desc(users.points))
		.limit(100)

	// 2. Watch Time Leaderboard (Top 100)
	const topWatchTime = await db
		.select({
			id: users.id,
			image: users.image,
		})
		.from(users)
		.where(baseConditions.length > 0 ? and(...baseConditions) : undefined)
		.orderBy(desc(users.watchTime))
		.limit(100)

	// 3. Gambling Sideboards (Top 10 Gainers & Losers)
	const topGainers = await db
		.select({ id: users.id, image: users.image })
		.from(users)
		.where(gt(users.gambleNetPoints, 0))
		.orderBy(desc(users.gambleNetPoints))
		.limit(10)

	const topLosers = await db
		.select({ id: users.id, image: users.image })
		.from(users)
		.where(lt(users.gambleNetPoints, 0))
		.orderBy(desc(users.gambleNetPoints))
		.limit(10)

	const userMap = new Map<string, LeaderboardUserEntry>()
	for (const u of [...topPoints, ...topWatchTime, ...topGainers, ...topLosers]) {
		if (u.id) {
			userMap.set(u.id, u)
		}
	}

	return Array.from(userMap.values())
}

/**
 * Syncs user profile pictures for leaderboard chatters in batches of up to 100 via Twitch Helix.
 */
export async function syncLeaderboardAvatars(options: { missingOnly?: boolean } = {}) {
	try {
		const streamerToken = await getStreamerToken()
		const botToken = await getBotToken()
		if (!streamerToken && !botToken) {
			return 0
		}

		const leaderboardUsers = await getTopLeaderboardUsers()
		if (leaderboardUsers.length === 0) {
			return 0
		}

		const targetUsers = options.missingOnly
			? leaderboardUsers.filter(u => !u.image || u.image.trim() === '')
			: leaderboardUsers

		if (targetUsers.length === 0) {
			return 0
		}

		const targetIds = targetUsers.map(u => u.id)
		const api = getApiClient()
		let updatedCount = 0

		// Twitch Helix /helix/users supports up to 100 user IDs per batch
		const CHUNK_SIZE = 100
		for (let i = 0; i < targetIds.length; i += CHUNK_SIZE) {
			const chunk = targetIds.slice(i, i + CHUNK_SIZE)
			const twitchUsers = await api.users.getUsersByIds(chunk)

			for (const twitchUser of twitchUsers) {
				if (twitchUser.profilePictureUrl) {
					await db.update(users)
						.set({
							image: twitchUser.profilePictureUrl,
							displayName: twitchUser.displayName,
							username: cleanUsername(twitchUser.name),
							updatedAt: new Date(),
						})
						.where(eq(users.id, twitchUser.id))
					updatedCount++
				}
			}
		}

		if (updatedCount > 0) {
			botLogger.info({ updatedCount, missingOnly: !!options.missingOnly }, 'Successfully synchronized leaderboard user profile pictures')
		}

		return updatedCount
	}
	catch (err) {
		botLogger.error({ err }, 'Failed to synchronize leaderboard avatars from Twitch')
		return 0
	}
}

/**
 * Starts the avatar synchronization background intervals.
 */
export function startAvatarSyncEngine() {
	if (missingCheckIntervalId || fullRefreshIntervalId) {
		return
	}

	// 10-minute check for any missing pictures
	missingCheckIntervalId = setInterval(() => {
		syncLeaderboardAvatars({ missingOnly: true }).catch(err =>
			botLogger.error({ err }, 'Error during scheduled 10-minute avatar sync'),
		)
	}, MISSING_CHECK_INTERVAL_MS)

	// 6-hour full refresh to ensure avatar changes on Twitch are kept up to date
	fullRefreshIntervalId = setInterval(() => {
		syncLeaderboardAvatars({ missingOnly: false }).catch(err =>
			botLogger.error({ err }, 'Error during scheduled 6-hour avatar sync'),
		)
	}, FULL_REFRESH_INTERVAL_MS)

	// Trigger initial missing sync asynchronously
	Promise.resolve().then(() => {
		syncLeaderboardAvatars({ missingOnly: true }).catch(err =>
			botLogger.error({ err }, 'Error during initial avatar sync'),
		)
	})

	botLogger.info('Leaderboard avatar sync engine started.')
}

/**
 * Stops the avatar synchronization intervals (useful for test teardown / reloading).
 */
export function stopAvatarSyncEngine() {
	if (missingCheckIntervalId) {
		clearInterval(missingCheckIntervalId)
		missingCheckIntervalId = null
	}
	if (fullRefreshIntervalId) {
		clearInterval(fullRefreshIntervalId)
		fullRefreshIntervalId = null
	}
}
