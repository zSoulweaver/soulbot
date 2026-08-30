import { EventEmitter } from 'node:events'
import { getStreamInfo } from '~~/server/bot/services/stream'
import { db } from '~~/server/database'
import { excludedUsers } from '~~/server/database/schema'
import { botLogger } from '~~/server/utils/logger'
import { getApiClient, getBotToken, getStreamerToken } from '~~/server/utils/twurple'
import { PollingEngine } from './polling-engine'

export interface ChatterActivity {
	id: string
	username: string
	displayName: string
}

export interface ActivityTickPayload {
	chatters: ChatterActivity[]
	isOnline: boolean
	timestamp: number
}

export class ActivityTracker extends EventEmitter {
	public readonly name = 'activity-tracker'
	private engine: PollingEngine

	constructor() {
		super()
		this.engine = new PollingEngine({
			name: 'activity-tracker',
			intervalMs: 60000,
			action: () => this.tick(),
		})
	}

	public override on(event: 'tick', listener: (payload: ActivityTickPayload) => void | Promise<void>): this {
		return super.on(event, listener)
	}

	public override off(event: 'tick', listener: (payload: ActivityTickPayload) => void | Promise<void>): this {
		return super.off(event, listener)
	}

	public override emit(event: 'tick', payload: ActivityTickPayload): boolean {
		return super.emit(event, payload)
	}

	public get isRunning(): boolean {
		return this.engine.isRunning
	}

	public start(): void {
		this.engine.start()
	}

	public stop(): void {
		this.engine.stop()
	}

	public getStatus() {
		return this.engine.getStatus()
	}

	async tick(): Promise<void> {
		const streamerToken = await getStreamerToken()
		if (!streamerToken || !streamerToken.userId) {
			botLogger.warn('[Activity Tracker] Skipping tick: Streamer Twitch token/userId not found.')
			return
		}

		const stream = await getStreamInfo()
		const isOnline = stream.isOnline

		// Fetch chatters
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

		const activeChatters: ChatterActivity[] = []
		for (const chatter of chatters) {
			const userId = chatter.userId
			const username = chatter.userName

			if (excludedUserIds.has(userId) || excludedUsernames.has(username.toLowerCase())) {
				continue
			}

			activeChatters.push({
				id: userId,
				username: username.toLowerCase(),
				displayName: chatter.userDisplayName,
			})
		}

		const payload: ActivityTickPayload = {
			chatters: activeChatters,
			isOnline,
			timestamp: Date.now(),
		}

		this.emit('tick', payload)
	}
}

export const activityTracker = new ActivityTracker()
