import { createTemplateContext, renderCustomTemplate } from '~~/server/bot/core/variables-engine'
import { sendRawChatMessage } from '~~/server/utils/chat'
import { botLogger } from '~~/server/utils/logger'
import { getAppSettings, updateAppSetting } from '~~/server/utils/settings'
import { getStreamerChannelName } from '~~/server/utils/twurple'

let bonusTimeout: NodeJS.Timeout | null = null

export async function scheduleBonusEnd(endTimeMs: number) {
	if (bonusTimeout) {
		clearTimeout(bonusTimeout)
		bonusTimeout = null
	}

	const delay = endTimeMs - Date.now()
	if (delay <= 0) {
		await endBonusEvent()
		return
	}

	botLogger.info(`[Bonus Manager] Scheduling bonus end in ${Math.round(delay / 1000)}s`)
	bonusTimeout = setTimeout(async () => {
		await endBonusEvent()
	}, delay)
}

export function cancelBonusEnd() {
	if (bonusTimeout) {
		clearTimeout(bonusTimeout)
		bonusTimeout = null
	}
}

export async function endBonusEvent() {
	bonusTimeout = null
	try {
		const settings = await getAppSettings()
		if (Number(settings.pointsGamblingBonusEndTime) === 0) {
			return // Already ended or not active
		}

		// Clear end time in database
		await updateAppSetting('points.gambling_bonus_end_time', '0')

		// Broadcast end message to chat
		const channel = await getStreamerChannelName()
		if (channel) {
			const ctx = createTemplateContext(channel)
			const rendered = await renderCustomTemplate(settings.pointsGamblingBonusEndMessage, ctx, {
				multiplier: settings.pointsGamblingBonusWinMultiplier,
				threshold: settings.pointsGamblingBonusWinMinRoll,
				duration: settings.pointsGamblingBonusDuration,
			})
			await sendRawChatMessage(channel, rendered)
		}
		botLogger.info('[Bonus Manager] Gambling bonus event ended and chat notified')
	}
	catch (err) {
		botLogger.error({ err }, '[Bonus Manager] Error ending bonus event')
	}
}

export async function initBonusManager() {
	try {
		const settings = await getAppSettings()
		const endTime = Number(settings.pointsGamblingBonusEndTime)
		if (endTime > Date.now()) {
			await scheduleBonusEnd(endTime)
		}
		else if (endTime > 0) {
			// Clean up stale end time
			await updateAppSetting('points.gambling_bonus_end_time', '0')
		}
	}
	catch (err) {
		botLogger.error({ err }, '[Bonus Manager] Failed to initialize bonus manager')
	}
}
