import { eq } from 'drizzle-orm'
import { botEventBus } from '~~/server/bot/core/events'
import { getStreamInfo } from '~~/server/bot/services/stream'
import { db } from '~~/server/database'
import { timers } from '~~/server/database/schema'
import { botLogger } from '~~/server/utils/logger'
import { getChatClient, getStreamerChannelName } from '~~/server/utils/twurple'

let globalMessageCount = 0
export const lastTriggerMessageCountMap = new Map<string, number>()
let timerIntervalId: NodeJS.Timeout | null = null

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

			botLogger.info(
				{ timerId: timer.id, name: timer.name, message: messageToSend },
				'[Timer Engine] Sending scheduled message to chat',
			)
			await chatClient.say(channelName, messageToSend)

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
	if (timerIntervalId) {
		return
	}

	botLogger.info('[Timer Engine] Starting automated chat message timers loop...')
	timerIntervalId = setInterval(executeTimerCheck, 60000)
	timerIntervalId.unref()
}

export function stopTimerEngine() {
	if (timerIntervalId) {
		clearInterval(timerIntervalId)
		timerIntervalId = null
		botLogger.info('[Timer Engine] Automated chat message timers loop stopped.')
	}
}
