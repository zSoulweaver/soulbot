import type { ChatMiddleware } from '../types'
import { sql } from 'drizzle-orm'
import { db } from '~~/server/database'
import { users } from '~~/server/database/schema'
import { botLogger } from '~~/server/utils/logger'
import { trackUserChatMessage } from '../chat-history'
import { cleanUsername } from '../utils'

const lastSeenCache = new Map<string, number>()
const USER_TRACKING_THROTTLE_MS = 5 * 60 * 1000

function pruneStaleUserTrackingCache(): void {
	const expireTime = Date.now() - USER_TRACKING_THROTTLE_MS * 2
	for (const [userId, lastSeen] of lastSeenCache.entries()) {
		if (lastSeen < expireTime) {
			lastSeenCache.delete(userId)
		}
	}
}

/**
 * Upserts users in Drizzle and updates live role parameters when they chat.
 * Throttled to prevent DB lock contention.
 */
export const userTrackingMiddleware: ChatMiddleware = async (event, next) => {
	const userId = event.raw.userInfo.userId
	const nowTime = Date.now()
	const lastUpdated = lastSeenCache.get(userId)

	// Keep cache bounded
	if (lastSeenCache.size > 2000) {
		pruneStaleUserTrackingCache()
	}

	// Record chat message for recent history buffer
	trackUserChatMessage(userId, event.message)

	// Throttled database upsert
	if (!lastUpdated || (nowTime - lastUpdated) > USER_TRACKING_THROTTLE_MS) {
		const now = new Date()
		const isBroadcaster = event.raw.userInfo.isBroadcaster
		const isMod = event.raw.userInfo.isMod
		const isVip = event.raw.userInfo.isVip
		const isSubscriber = event.raw.userInfo.isSubscriber

		const role: 'caster' | 'moderator' | 'viewer' = isBroadcaster
			? 'caster'
			: (isMod ? 'moderator' : 'viewer')

		try {
			await db.insert(users)
				.values({
					id: userId,
					username: cleanUsername(event.raw.userInfo.userName),
					displayName: event.raw.userInfo.displayName,
					role,
					isVip,
					isSubscriber,
					points: 0,
					firstSeen: nowTime,
					lastSeen: nowTime,
					createdAt: now,
					updatedAt: now,
				})
				.onConflictDoUpdate({
					target: users.id,
					set: {
						username: cleanUsername(event.raw.userInfo.userName),
						displayName: event.raw.userInfo.displayName,
						role: sql`CASE WHEN ${users.role} = 'admin' AND ${role} = 'moderator' THEN 'admin' ELSE ${role} END`,
						isVip,
						isSubscriber,
						lastSeen: nowTime,
						updatedAt: now,
					},
				})

			lastSeenCache.set(userId, nowTime)
		}
		catch (err) {
			botLogger.error({ err, userId }, 'Failed to track user role and metadata in database')
		}
	}

	await next()
}
