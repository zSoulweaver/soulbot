import type { ApiClient } from '@twurple/api'
import type { EventSubChannelCheerEvent, EventSubChannelFollowEvent, EventSubChannelSubscriptionEvent, EventSubChannelSubscriptionGiftEvent, EventSubStreamOfflineEvent, EventSubStreamOnlineEvent, EventSubSubscription } from '@twurple/eventsub-base'
import { EventEmitter } from 'node:events'
import { EventSubHttpListener, EventSubMiddleware } from '@twurple/eventsub-http'
import { NgrokAdapter } from '@twurple/eventsub-ngrok'
import { EventSubWsListener } from '@twurple/eventsub-ws'
import { botLogger } from '~~/server/utils/logger'

export interface EventSubMap {
	'follow': EventSubChannelFollowEvent
	'subscription': EventSubChannelSubscriptionEvent
	'subscription.gift': EventSubChannelSubscriptionGiftEvent
	'cheer': EventSubChannelCheerEvent
	'stream.online': EventSubStreamOnlineEvent
	'stream.offline': EventSubStreamOfflineEvent
}

export class EventSubEmitter extends EventEmitter {
	override on<K extends keyof EventSubMap>(event: K, listener: (data: EventSubMap[K]) => void | Promise<void>): this {
		return super.on(event, listener)
	}

	override off<K extends keyof EventSubMap>(event: K, listener: (data: EventSubMap[K]) => void | Promise<void>): this {
		return super.off(event, listener)
	}

	override emit<K extends keyof EventSubMap>(event: K, data: EventSubMap[K]): boolean {
		return super.emit(event, data)
	}

	async emitAsync<K extends keyof EventSubMap>(event: K, data: EventSubMap[K]): Promise<void> {
		const listeners = this.listeners(event) as ((data: EventSubMap[K]) => void | Promise<void>)[]
		for (const listener of listeners) {
			try {
				await listener(data)
			}
			catch (err) {
				botLogger.error({ err, event }, '[EventSubEmitter] Error in event listener')
			}
		}
	}
}

class EventSubManager {
	public events = new EventSubEmitter()
	private listener: EventSubWsListener | EventSubHttpListener | EventSubMiddleware | null = null
	private activeSubscriptions: EventSubSubscription[] = []

	async start(apiClient: ApiClient, streamerUserId: string) {
		if (this.listener) {
			botLogger.info('[EventSub] EventSub listener already initialized.')
			return
		}

		const config = useRuntimeConfig()
		const transport = config.twitchEventsubTransport || 'ws'

		try {
			if (transport === 'ws') {
				this.listener = new EventSubWsListener({ apiClient })
			}
			else if (transport === 'http') {
				this.listener = new EventSubMiddleware({
					apiClient,
					hostName: config.twitchEventsubHost || '',
					pathPrefix: '/api/twitch/eventsub',
					secret: config.twitchEventsubSecret,
				})
			}
			else if (transport === 'ngrok') {
				this.listener = new EventSubHttpListener({
					apiClient,
					adapter: new NgrokAdapter({
						port: Number.parseInt(config.twitchEventsubPort, 10) || 8080,
						ngrokConfig: config.ngrokAuthtoken ? { authtoken: config.ngrokAuthtoken } : undefined,
					}),
					secret: config.twitchEventsubSecret,
				})
			}
			else {
				throw new Error(`Unsupported Twitch EventSub transport: ${transport}`)
			}

			const followSub = this.listener.onChannelFollow(streamerUserId, streamerUserId, (e) => {
				botLogger.info({ user: e.userName }, '[EventSub] follow received')
				this.events.emitAsync('follow', e)
			})
			this.activeSubscriptions.push(followSub)

			const subSub = this.listener.onChannelSubscription(streamerUserId, (e) => {
				botLogger.info({ user: e.userName }, '[EventSub] subscription received')
				this.events.emitAsync('subscription', e)
			})
			this.activeSubscriptions.push(subSub)

			const giftSub = this.listener.onChannelSubscriptionGift(streamerUserId, (e) => {
				botLogger.info({ gifter: e.gifterName, amount: e.amount }, '[EventSub] subscription gift received')
				this.events.emitAsync('subscription.gift', e)
			})
			this.activeSubscriptions.push(giftSub)

			const cheerSub = this.listener.onChannelCheer(streamerUserId, (e) => {
				botLogger.info({ user: e.userName, bits: e.bits }, '[EventSub] cheer received')
				this.events.emitAsync('cheer', e)
			})
			this.activeSubscriptions.push(cheerSub)

			const onlineSub = this.listener.onStreamOnline(streamerUserId, (e) => {
				botLogger.info('[EventSub] stream went online')
				this.events.emitAsync('stream.online', e)
			})
			this.activeSubscriptions.push(onlineSub)

			const offlineSub = this.listener.onStreamOffline(streamerUserId, (e) => {
				botLogger.info('[EventSub] stream went offline')
				this.events.emitAsync('stream.offline', e)
			})
			this.activeSubscriptions.push(offlineSub)
			if (this.listener instanceof EventSubMiddleware) {
				await this.listener.markAsReady()
			}
			else {
				this.listener.start()
			}
			botLogger.info(`[EventSub] EventSub listener (${transport}) started successfully.`)

			// Print native CLI test commands for local development if ngrok is active
			if (transport === 'ngrok') {
				botLogger.info('─────────────────────────────────────────────')
				botLogger.info('   🔌 Twitch CLI Webhook Mock Event Triggers ')
				botLogger.info('─────────────────────────────────────────────')
				for (const sub of this.activeSubscriptions) {
					try {
						const command = await sub.getCliTestCommand()
						const cliName = (sub as any)._cliName || 'unknown'
						botLogger.info(`[${cliName.toUpperCase()}]`)
						botLogger.info(`  ${command}`)
					}
					catch {
						// getCliTestCommand requires subscription to be registered
					}
				}
				botLogger.info('─────────────────────────────────────────────')
			}
		}
		catch (err) {
			botLogger.error({ err }, `[EventSub] Failed to start EventSub listener (${transport})`)
			this.listener = null
			this.activeSubscriptions = []
		}
	}

	stop() {
		if (this.listener) {
			botLogger.info('[EventSub] Stopping EventSub subscriptions and connection...')
			for (const sub of this.activeSubscriptions) {
				try {
					sub.stop()
				}
				catch {}
			}
			this.activeSubscriptions = []
			this.listener = null
			botLogger.info('[EventSub] EventSub listener stopped.')
		}
	}

	/**
	 * Process-level simulator helper to trigger mock events inside our server memory.
	 * Decoupled from any physical socket and primarily used in automated testing and manual diagnostic API calls.
	 */
	async simulate<K extends keyof EventSubMap>(event: K, data: EventSubMap[K]) {
		botLogger.info({ event }, '[EventSub] Simulating event')
		await this.events.emitAsync(event, data)
	}
}

export const eventSubManager = new EventSubManager()
