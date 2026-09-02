import { and, desc, gt, inArray, lt, notInArray } from 'drizzle-orm'
import { PollingEngine } from '~~/server/bot/core/polling-engine'
import { db } from '~~/server/database'
import { excludedUsers, users } from '~~/server/database/schema'
import { botLogger } from '~~/server/utils/logger'
import { getApiClient, getBotToken, getStreamerToken } from '~~/server/utils/twurple'
import { cleanUsername } from '../core/utils'

const MISSING_CHECK_INTERVAL_MS = 10 * 60 * 1000 // 10 minutes
const FULL_REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000 // 6 hours

export interface AvatarSyncUserEntry {
	id: string
	image: string | null
}

export type LeaderboardUserEntry = AvatarSyncUserEntry

/**
 * Gathers user IDs for top leaderboard chatters across points, watch time, and gambling.
 */
export async function getLeaderboardUsers(): Promise<AvatarSyncUserEntry[]> {
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

	const userMap = new Map<string, AvatarSyncUserEntry>()
	for (const u of [...topPoints, ...topWatchTime, ...topGainers, ...topLosers]) {
		if (u.id) {
			userMap.set(u.id, u)
		}
	}

	return Array.from(userMap.values())
}

/**
 * Gathers user IDs for moderators and administrators.
 */
export async function getModeratorUsers(): Promise<AvatarSyncUserEntry[]> {
	const modUsers = await db
		.select({
			id: users.id,
			image: users.image,
		})
		.from(users)
		.where(inArray(users.role, ['admin', 'moderator']))

	return modUsers
}

/**
 * Gathers user IDs for excluded users and bot account.
 */
export async function getExcludedUsers(): Promise<AvatarSyncUserEntry[]> {
	const excludedList = await db
		.select({
			id: excludedUsers.id,
		})
		.from(excludedUsers)

	const excludedIds = excludedList.map(u => u.id).filter(Boolean) as string[]

	const botToken = await getBotToken()
	if (botToken?.userId) {
		excludedIds.push(botToken.userId)
	}

	if (excludedIds.length === 0) {
		return []
	}

	const dbUsers = await db
		.select({
			id: users.id,
			image: users.image,
		})
		.from(users)
		.where(inArray(users.id, excludedIds))

	const foundIds = new Set(dbUsers.map(u => u.id))
	const missingFromDb = excludedIds
		.filter(id => !foundIds.has(id))
		.map(id => ({ id, image: null }))

	return [...dbUsers, ...missingFromDb]
}

/**
 * Master getter combining all high-priority user targets (leaderboard, mods, exclusions).
 */
export async function getPriorityAvatarSyncUsers(): Promise<AvatarSyncUserEntry[]> {
	const [leaderboardUsers, modUsers, excludedUsersList] = await Promise.all([
		getLeaderboardUsers(),
		getModeratorUsers(),
		getExcludedUsers(),
	])

	const userMap = new Map<string, AvatarSyncUserEntry>()
	for (const u of [...leaderboardUsers, ...modUsers, ...excludedUsersList]) {
		if (u.id) {
			userMap.set(u.id, u)
		}
	}

	return Array.from(userMap.values())
}

/**
 * Legacy alias for backwards compatibility.
 */
export async function getTopLeaderboardUsers(): Promise<LeaderboardUserEntry[]> {
	return getLeaderboardUsers()
}

/**
 * Syncs user profile pictures for priority users in batches of up to 100 via Twitch Helix.
 */
export async function syncLeaderboardAvatars(options: { missingOnly?: boolean } = {}) {
	try {
		const streamerToken = await getStreamerToken()
		const botToken = await getBotToken()
		if (!streamerToken && !botToken) {
			return 0
		}

		const priorityUsers = await getPriorityAvatarSyncUsers()
		if (priorityUsers.length === 0) {
			return 0
		}

		const targetUsers = options.missingOnly
			? priorityUsers.filter(u => !u.image || u.image.trim() === '')
			: priorityUsers

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
					await db.insert(users)
						.values({
							id: twitchUser.id,
							username: cleanUsername(twitchUser.name),
							displayName: twitchUser.displayName,
							image: twitchUser.profilePictureUrl,
							updatedAt: new Date(),
						})
						.onConflictDoUpdate({
							target: users.id,
							set: {
								image: twitchUser.profilePictureUrl,
								displayName: twitchUser.displayName,
								username: cleanUsername(twitchUser.name),
								updatedAt: new Date(),
							},
						})
					updatedCount++
				}
			}
		}

		if (updatedCount > 0) {
			botLogger.info({ updatedCount, missingOnly: !!options.missingOnly }, 'Successfully synchronized user profile pictures')
		}

		return updatedCount
	}
	catch (err) {
		botLogger.error({ err }, 'Failed to synchronize avatars from Twitch')
		return 0
	}
}

export const avatarSyncMissingEngine = new PollingEngine({
	name: 'avatar-sync-missing',
	intervalMs: MISSING_CHECK_INTERVAL_MS,
	runImmediately: true,
	action: async () => {
		try {
			await syncLeaderboardAvatars({ missingOnly: true })
		}
		catch (err) {
			botLogger.error({ err }, 'Error during scheduled 10-minute avatar sync')
		}
	},
})

export const avatarSyncFullEngine = new PollingEngine({
	name: 'avatar-sync-full',
	intervalMs: FULL_REFRESH_INTERVAL_MS,
	action: async () => {
		try {
			await syncLeaderboardAvatars({ missingOnly: false })
		}
		catch (err) {
			botLogger.error({ err }, 'Error during scheduled 6-hour avatar sync')
		}
	},
})

export const avatarSyncEngine = {
	name: 'avatar-sync',
	start: () => {
		avatarSyncMissingEngine.start()
		avatarSyncFullEngine.start()
		botLogger.info('Leaderboard avatar sync engine started.')
	},
	stop: () => {
		avatarSyncMissingEngine.stop()
		avatarSyncFullEngine.stop()
		botLogger.info('Leaderboard avatar sync engine stopped.')
	},
	getStatus: () => ({
		name: 'avatar-sync',
		missing: avatarSyncMissingEngine.getStatus(),
		full: avatarSyncFullEngine.getStatus(),
	}),
}

/**
 * Starts the avatar synchronization background intervals.
 */
export function startAvatarSyncEngine() {
	avatarSyncEngine.start()
}

/**
 * Stops the avatar synchronization intervals (useful for test teardown / reloading).
 */
export function stopAvatarSyncEngine() {
	avatarSyncEngine.stop()
}
