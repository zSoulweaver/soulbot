import { inArray, sql } from 'drizzle-orm'
import { db } from '~~/server/database'
import { settings, users } from '~~/server/database/schema'
import { botLogger } from '~~/server/utils/logger'

// In-memory active chatters map (userId -> chatterDetails)
const activeUsersMap = new Map<string, { id: string, username: string, displayName: string, timestamp: number }>()

/**
 * Marks a user as active for watch-time points payout.
 */
export function trackActiveUser(userId: string, username: string, displayName: string): void {
	activeUsersMap.set(userId, {
		id: userId,
		username,
		displayName,
		timestamp: Date.now(),
	})
}

/**
 * Starts the dynamic watch-time points payout engine loop.
 * Periodically loads interval and payout settings from the database and performs high-efficiency batched payouts.
 */
export function startPayoutEngine(): void {
	botLogger.info('[Payout Engine] Starting active chatter points loop...')

	async function runPayoutCycle() {
		try {
			// Fetch settings from DB (fall back to default 5 minutes and 5 points if not set)
			const dbSettings = await db.select().from(settings)
			const intervalSetting = dbSettings.find(s => s.key === 'points.payout_interval')
			const amountSetting = dbSettings.find(s => s.key === 'points.payout_amount')

			const intervalMinutes = intervalSetting ? Math.max(1, Number(intervalSetting.value)) : 5
			const payoutAmount = amountSetting ? Math.max(0, Number(amountSetting.value)) : 5

			const payoutIntervalMs = intervalMinutes * 60 * 1000
			const now = Date.now()
			const activeUserIds: string[] = []

			// Identify chatters active within the configured window
			for (const [userId, data] of activeUsersMap.entries()) {
				if (now - data.timestamp <= payoutIntervalMs) {
					activeUserIds.push(userId)
				}
				else {
					// Clean up chatters who have gone inactive
					activeUsersMap.delete(userId)
				}
			}

			// Perform batched point awards in a single query
			if (activeUserIds.length > 0 && payoutAmount > 0) {
				await db.update(users)
					.set({
						points: sql`${users.points} + ${payoutAmount}`,
						updatedAt: new Date(),
					})
					.where(inArray(users.id, activeUserIds))

				botLogger.info(
					{ activeCount: activeUserIds.length, payoutAmount, intervalMinutes },
					'Batch awarded watch-time points to active chatters',
				)
			}

			// Schedule the next check dynamically to respect runtime updates to the interval setting
			setTimeout(runPayoutCycle, payoutIntervalMs).unref()
		}
		catch (err) {
			botLogger.error({ err }, 'Error in active chatter payout cycle')
			// Retry in 1 minute on failure
			setTimeout(runPayoutCycle, 60000).unref()
		}
	}

	// Schedule the first run in 5 minutes
	setTimeout(runPayoutCycle, 5 * 60 * 1000).unref()
}
