import { eq } from 'drizzle-orm'
import { handleCommand } from '~~/server/bot/core/command-dispatcher'
import { botEventBus } from '~~/server/bot/core/events'
import { PollingEngine } from '~~/server/bot/core/polling-engine'
import { getStreamInfo } from '~~/server/bot/services/stream'
import { db } from '~~/server/database'
import { timers } from '~~/server/database/schema'
import { sendRawChatMessage } from '~~/server/utils/chat'
import { botLogger } from '~~/server/utils/logger'
import { getBotToken, getChatClient, getStreamerChannelName, getStreamerToken } from '~~/server/utils/twurple'

let globalMessageCount = 0
export const lastTriggerMessageCountMap = new Map<string, number>()

export const timerEngine = new PollingEngine({
	name: 'timers',
	intervalMs: 60000,
	action: () => executeTimerCheck(),
})

botEventBus.on('chat', () => {
	globalMessageCount++
})

export function getGlobalMessageCount() {
	return globalMessageCount
}

export function resetGlobalMessageCount() {
	globalMessageCount = 0
	lastTriggerMessageCountMap.clear()
}

export async function executeTimerCheck() {
	try {
		const chatClient = await getChatClient()
		if (!chatClient || !chatClient.isConnected) {
			return
		}

		const channelName = await getStreamerChannelName()
		if (!channelName) {
			return
		}

		const streamInfo = await getStreamInfo()
		const isOnline = streamInfo.isOnline

		const activeTimers = await db
			.select()
			.from(timers)
			.where(eq(timers.enabled, true))

		const now = Date.now()

		for (const timer of activeTimers) {
			const intervalMinutes = isOnline ? timer.intervalOnline : timer.intervalOffline

			// If interval is 0, it means it is disabled
			if (intervalMinutes <= 0) {
				continue
			}

			// Check if enough time has passed
			const lastTriggeredTime = timer.lastTriggeredAt ? timer.lastTriggeredAt.getTime() : 0
			const timePassedMs = now - lastTriggeredTime
			const requiredMs = intervalMinutes * 60 * 1000

			if (timePassedMs < requiredMs) {
				continue
			}

			// Check if enough messages have been sent
			if (!lastTriggerMessageCountMap.has(timer.id)) {
				lastTriggerMessageCountMap.set(timer.id, globalMessageCount)
			}
			const lastCount = lastTriggerMessageCountMap.get(timer.id)!
			const messagesSent = globalMessageCount - lastCount

			if (messagesSent < timer.minMessages) {
				// We don't trigger yet, and we don't update the time/count so that it keeps checking on subsequent runs
				continue
			}

			// Find next enabled message to send
			const allMessages = timer.messages
			if (!allMessages || allMessages.length === 0) {
				continue
			}

			let foundIndex = -1
			for (let i = 0; i < allMessages.length; i++) {
				const index = (timer.lastSentIndex + i) % allMessages.length
				if (allMessages[index]?.enabled) {
					foundIndex = index
					break
				}
			}

			if (foundIndex === -1) {
				// No enabled messages in this timer group
				continue
			}

			const messageToSend = allMessages[foundIndex]!.text

			if (messageToSend.startsWith('!')) {
				botLogger.info(
					{ timerId: timer.id, name: timer.name, command: messageToSend },
					'[Timer Engine] Executing command silently from timer message',
				)

				const streamerToken = await getStreamerToken()
				const botToken = await getBotToken()

				const userId = botToken?.userId || streamerToken?.userId || 'bot_timer'
				const userName = botToken?.userName || streamerToken?.userName || 'bot'
				const displayName = botToken?.displayName || streamerToken?.displayName || 'Bot'

				const rawMsg = {
					userInfo: {
						userId,
						userName,
						displayName,
						isBroadcaster: true,
						isMod: true,
						isVip: false,
						isSubscriber: false,
						color: '#FFFFFF',
						badges: new Map(),
						badgeInfo: new Map(),
						userType: '',
					},
					id: `timer-msg-${timer.id}-${now}`,
					date: new Date(now),
					channelId: streamerToken?.userId || 'channel_id',
					bits: 0,
					isCheer: false,
					isRedemption: false,
					isFirst: false,
					isHighlight: false,
					isReturningChatter: false,
					tags: new Map(),
					isTimer: true,
				} as any

				await handleCommand(channelName, userName, messageToSend, rawMsg)
			}
			else {
				botLogger.info(
					{ timerId: timer.id, name: timer.name, message: messageToSend },
					'[Timer Engine] Sending scheduled message to chat',
				)
				await sendRawChatMessage(channelName, messageToSend)
			}

			const nextSentIndex = (foundIndex + 1) % allMessages.length
			await db
				.update(timers)
				.set({
					lastSentIndex: nextSentIndex,
					lastTriggeredAt: new Date(now),
					updatedAt: new Date(now),
				})
				.where(eq(timers.id, timer.id))

			lastTriggerMessageCountMap.set(timer.id, globalMessageCount)
		}
	}
	catch (err) {
		botLogger.error({ err }, '[Timer Engine] Error executing timer checks')
	}
}

export function startTimerEngine() {
	timerEngine.start()
}

export function stopTimerEngine() {
	timerEngine.stop()
}
