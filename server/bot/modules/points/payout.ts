import type { BackgroundEngine } from '~~/server/bot/core/engine-registry'
import { eq, sql } from 'drizzle-orm'
import { activityTracker } from '~~/server/bot/core/activity-tracker'
import { getStreamInfo } from '~~/server/bot/services/stream'
import { db } from '~~/server/database'
import { excludedUsers, settings, users } from '~~/server/database/schema'
import { botLogger } from '~~/server/utils/logger'
import { getAppSettings } from '~~/server/utils/settings'
import { getApiClient, getBotToken, getStreamerToken } from '~~/server/utils/twurple'

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
 * Core points payout cycle execution.
 */
export async function executePayoutCycle(): Promise<void> {
	// Get streamer token to retrieve channel/broadcaster ID
	const streamerToken = await getStreamerToken()

	if (!streamerToken || !streamerToken.userId) {
		botLogger.warn('[Payout Engine] Skipping cycle: Streamer Twitch token/userId not found.')
		throw new Error('Streamer Twitch token/userId not found')
	}

	// Fetch current points settings from cache
	const settings = await getAppSettings()

	// Determine online status of the streamer
	const stream = await getStreamInfo()
	const isOnline = stream.isOnline

	// Select payout details based on stream online status
	const payoutAmount = isOnline ? settings.payoutAmount : settings.payoutAmountOffline
	const activeBonus = settings.activeBonus

	if (!isOnline && payoutAmount === 0) {
		botLogger.info('[Payout Engine] Stream is offline and offline payout is 0. Skipping payout.')
		return
	}

	botLogger.info(
		{ isOnline, payoutAmount, activeBonus },
		'[Payout Engine] Executing payout cycle',
	)

	// Fetch all currently connected chatters from Twitch chat
	const api = getApiClient()
	const paginator = api.chat.getChattersPaginated(streamerToken.userId)
	const chatters = await paginator.getAll()

	// Fetch manual exclusions from the database
	const manualExclusions = await db.select().from(excludedUsers)
	const excludedUserIds = new Set<string>()
	const excludedUsernames = new Set<string>()

	for (const exc of manualExclusions) {
		if (exc.id)
			excludedUserIds.add(exc.id)
		excludedUsernames.add(exc.username.toLowerCase())
	}

	const botToken = await getBotToken()

	if (botToken) {
		if (botToken.userId)
			excludedUserIds.add(botToken.userId)
		if (botToken.userName)
			excludedUsernames.add(botToken.userName.toLowerCase())
	}

	const chatterValues: any[] = []
	const now = Date.now()

	// Build the payout metrics list
	for (const chatter of chatters) {
		const userId = chatter.userId
		const username = chatter.userName

		if (excludedUserIds.has(userId) || excludedUsernames.has(username.toLowerCase())) {
			continue // Skip excluded account
		}

		const displayName = chatter.userDisplayName

		// Check if the user is active (sent a message during this interval)
		const isActive = activeUsersMap.has(userId)
		const earnedPoints = payoutAmount + (isOnline && isActive ? activeBonus : 0)

		if (earnedPoints > 0) {
			chatterValues.push({
				id: userId,
				username,
				displayName,
				points: earnedPoints,
				firstSeen: now,
				lastSeen: now,
			})
		}
	}

	if (chatterValues.length > 0) {
		// Chunk upserts if they exceed SQLite limits
		const chunkSize = 500
		for (let i = 0; i < chatterValues.length; i += chunkSize) {
			const chunk = chatterValues.slice(i, i + chunkSize)
			await db.insert(users)
				.values(chunk)
				.onConflictDoUpdate({
					target: users.id,
					set: {
						points: sql`${users.points} + EXCLUDED.points`,
						username: sql`EXCLUDED.username`,
						displayName: sql`EXCLUDED.display_name`,
						lastSeen: now,
						updatedAt: new Date(),
					},
				})
		}

		botLogger.info(
			{ rewardedCount: chatterValues.length, payoutAmount, activeBonus },
			'[Payout Engine] Batch awarded points to chatters',
		)
	}

	// Clear the active users registry only on a successful cycle
	activeUsersMap.clear()
}

export class PayoutEngine implements BackgroundEngine {
	public readonly name = 'points-payout'
	private _isRunning = false
	private _nextPayoutTime: number | null = null

	constructor() {
		this.handleActivityTick = this.handleActivityTick.bind(this)
	}

	public get isRunning(): boolean {
		return this._isRunning
	}

	public get nextPayoutTime(): number | null {
		return this._nextPayoutTime
	}

	public setNextPayoutTime(time: number | null): void {
		this._nextPayoutTime = time
	}

	public start(): void {
		if (this._isRunning) {
			return
		}
		this._isRunning = true
		this._nextPayoutTime = Date.now() + 60000
		activityTracker.on('tick', this.handleActivityTick)
		botLogger.info('[Payout Engine] Starting active chatter points loop listener...')
	}

	public stop(): void {
		if (!this._isRunning) {
			return
		}
		this._isRunning = false
		activityTracker.off('tick', this.handleActivityTick)
		botLogger.info('[Payout Engine] Stopped active chatter points loop listener.')
	}

	public getStatus(): Record<string, any> {
		return {
			name: this.name,
			isRunning: this._isRunning,
			nextPayoutTime: this._nextPayoutTime,
		}
	}

	public async handleActivityTick(payload: {
		chatters: { id: string, username: string, displayName: string }[]
		isOnline: boolean
		timestamp: number
	}): Promise<void> {
		const { chatters, isOnline, timestamp } = payload

		// Fetch settings from cache
		const appSettings = await getAppSettings()
		const payoutIntervalMinutes = isOnline ? appSettings.payoutInterval : appSettings.payoutIntervalOffline

		if (this._nextPayoutTime === null) {
			// Initialize on first tick
			this._nextPayoutTime = timestamp + payoutIntervalMinutes * 60 * 1000
			return
		}

		if (timestamp < this._nextPayoutTime) {
			return // Not due yet
		}

		// Payout is due!
		const payoutAmount = isOnline ? appSettings.payoutAmount : appSettings.payoutAmountOffline
		const activeBonus = appSettings.activeBonus

		if (!isOnline && payoutAmount === 0) {
			// Offline and payout is 0, skip payout but reset timer
			this._nextPayoutTime = timestamp + payoutIntervalMinutes * 60 * 1000
			return
		}

		botLogger.info(
			{ isOnline, payoutAmount, activeBonus },
			'[Payout Engine] Executing points payout via activity tick',
		)

		const chatterValues: any[] = []
		for (const chatter of chatters) {
			const userId = chatter.id
			const username = chatter.username
			const displayName = chatter.displayName

			// Check if the user is active (sent a message during this interval)
			const isActive = activeUsersMap.has(userId)
			const earnedPoints = payoutAmount + (isOnline && isActive ? activeBonus : 0)

			if (earnedPoints > 0) {
				chatterValues.push({
					id: userId,
					username,
					displayName,
					points: earnedPoints,
					firstSeen: timestamp,
					lastSeen: timestamp,
				})
			}
		}

		if (chatterValues.length > 0) {
			// Chunk upserts if they exceed SQLite limits
			const chunkSize = 500
			for (let i = 0; i < chatterValues.length; i += chunkSize) {
				const chunk = chatterValues.slice(i, i + chunkSize)
				await db.insert(users)
					.values(chunk)
					.onConflictDoUpdate({
						target: users.id,
						set: {
							points: sql`${users.points} + EXCLUDED.points`,
							username: sql`EXCLUDED.username`,
							displayName: sql`EXCLUDED.display_name`,
							lastSeen: timestamp,
							updatedAt: new Date(),
						},
					})
			}

			botLogger.info(
				{ rewardedCount: chatterValues.length, payoutAmount, activeBonus },
				'[Payout Engine] Batch awarded points to chatters',
			)
		}

		// Clear active users registry only on successful payout
		activeUsersMap.clear()

		// Update next payout time
		this._nextPayoutTime = timestamp + payoutIntervalMinutes * 60 * 1000
	}
}

export const payoutEngine = new PayoutEngine()

/**
 * Returns the timestamp when the next payout cycle is scheduled to run.
 */
export function getNextPayoutTime(): number | null {
	return payoutEngine.nextPayoutTime
}

export function handleActivityTick(payload: {
	chatters: { id: string, username: string, displayName: string }[]
	isOnline: boolean
	timestamp: number
}): Promise<void> {
	return payoutEngine.handleActivityTick(payload)
}

/**
 * Starts the points payout listener.
 */
export function startPayoutEngine(): void {
	payoutEngine.start()
}

/**
 * Stops the points payout listener.
 */
export function stopPayoutEngine(): void {
	payoutEngine.stop()
}

/**
 * Triggers a manual payout cycle immediately and schedules the next regular cycle.
 */
export async function triggerManualPayout(): Promise<void> {
	botLogger.info('[Payout Engine] Manual payout triggered via API.')
	await executePayoutCycle()

	// Reset nextPayoutTime to payoutInterval minutes from now
	const appSettings = await getAppSettings()
	const stream = await getStreamInfo()
	const payoutIntervalMinutes = stream.isOnline ? appSettings.payoutInterval : appSettings.payoutIntervalOffline
	payoutEngine.setNextPayoutTime(Date.now() + payoutIntervalMinutes * 60 * 1000)
}

export { activeUsersMap }

export async function seedDefaultExclusions() {
	try {
		// Check if we already seeded exclusions in the past
		const [seededSetting] = await db
			.select()
			.from(settings)
			.where(eq(settings.key, 'points.exclusions_seeded'))

		if (seededSetting?.value === 'true') {
			return // Already seeded in the past, respect user's modifications (even if empty)
		}

		botLogger.info('No points payout exclusions found. Seeding default Twitch bots...')
		const defaultBots = ['streamelements', 'nightbot', 'wizebot', 'moobot']
		const api = getApiClient()

		const twitchUsers = await api.users.getUsersByNames(defaultBots)
		const valuesToInsert = twitchUsers.map(user => ({
			id: user.id,
			username: user.name.toLowerCase(),
			displayName: user.displayName,
			reason: 'Default Twitch Bot',
			createdAt: new Date(),
		}))

		if (valuesToInsert.length > 0) {
			await db.insert(excludedUsers)
				.values(valuesToInsert)
				.onConflictDoNothing({ target: excludedUsers.username })
		}

		// Mark as seeded in settings so we never overwrite the user's preferences again
		await db.insert(settings)
			.values({
				key: 'points.exclusions_seeded',
				value: 'true',
				updatedAt: new Date(),
			})
			.onConflictDoUpdate({
				target: settings.key,
				set: {
					value: 'true',
					updatedAt: new Date(),
				},
			})

		botLogger.info(`Successfully seeded ${valuesToInsert.length} default point exclusions.`)
	}
	catch (err) {
		botLogger.error({ err }, 'Failed to seed default point exclusions')
	}
}
