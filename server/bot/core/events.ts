import type { ChatMessageEvent } from './types'
import { EventEmitter } from 'node:events'

export interface BotEventMap {
	chat: ChatMessageEvent
}

class BotEventBus extends EventEmitter {
	override on<K extends keyof BotEventMap>(event: K, listener: (data: BotEventMap[K]) => void | Promise<void>): this {
		return super.on(event, listener)
	}

	override off<K extends keyof BotEventMap>(event: K, listener: (data: BotEventMap[K]) => void | Promise<void>): this {
		return super.off(event, listener)
	}

	override emit<K extends keyof BotEventMap>(event: K, data: BotEventMap[K]): boolean {
		return super.emit(event, data)
	}
}

export const botEventBus = new BotEventBus()
