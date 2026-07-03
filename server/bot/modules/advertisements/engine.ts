import { createTemplateContext, renderCustomTemplate } from '~~/server/bot/core/variables-engine'
import { getStreamInfo } from '~~/server/bot/services/stream'
import { sendRawChatMessage } from '~~/server/utils/chat'
import { botLogger } from '~~/server/utils/logger'
import { getAppSettings } from '~~/server/utils/settings'
import { getApiClient, getStreamerChannelName, getStreamerToken } from '~~/server/utils/twurple'

interface AdAlertState {
	nextAdTime: number
	warned5m: boolean
	warned3m: boolean
	warned1m: boolean
}

let adAlertState: AdAlertState | null = null
let adsIntervalId: NodeJS.Timeout | null = null

export async function executeAdsCheck() {
	try {
		const streamerToken = await getStreamerToken()
		if (!streamerToken || !streamerToken.userId) {
			return
		}

		// Only check if stream is online
		const streamInfo = await getStreamInfo()
		if (!streamInfo.isOnline) {
			adAlertState = null
			return
		}

		const settings = await getAppSettings()
		if (!settings.adsAlertsEnabled) {
			return
		}

		const api = getApiClient()
		let adSchedule: any = null
		try {
			adSchedule = await api.channels.getAdSchedule(streamerToken.userId)
		}
		catch (apiErr) {
			botLogger.error({ apiErr }, '[Ads Engine] Failed to fetch ad schedule from Twitch Helix')
			return
		}

		if (!adSchedule || !adSchedule.nextAdDate) {
			adAlertState = null
			return
		}

		const nextAdTime = adSchedule.nextAdDate.getTime()
		const now = Date.now()
		const remainingSeconds = Math.floor((nextAdTime - now) / 1000)

		if (remainingSeconds <= 0) {
			adAlertState = null
			return
		}

		// Reset warning flags if the next ad timestamp has changed
		if (!adAlertState || adAlertState.nextAdTime !== nextAdTime) {
			adAlertState = {
				nextAdTime,
				warned5m: false,
				warned3m: false,
				warned1m: false,
			}
		}

		const channelName = await getStreamerChannelName()
		if (!channelName)
			return

		// 5 minutes warning (range: 240s to 300s)
		if (settings.adsAlert5mEnabled && !adAlertState.warned5m && remainingSeconds <= 300 && remainingSeconds > 240) {
			adAlertState.warned5m = true
			await sendAdAlert(channelName, '5 minutes', adSchedule.duration)
		}

		// 3 minutes warning (range: 120s to 180s)
		if (settings.adsAlert3mEnabled && !adAlertState.warned3m && remainingSeconds <= 180 && remainingSeconds > 120) {
			adAlertState.warned3m = true
			await sendAdAlert(channelName, '3 minutes', adSchedule.duration)
		}

		// 1 minute warning (range: 0s to 60s)
		if (settings.adsAlert1mEnabled && !adAlertState.warned1m && remainingSeconds <= 60 && remainingSeconds > 0) {
			adAlertState.warned1m = true
			await sendAdAlert(channelName, '1 minute', adSchedule.duration)
		}
	}
	catch (err) {
		botLogger.error({ err }, '[Ads Engine] Error in ads check loop')
	}
}

async function sendAdAlert(channelName: string, timeText: string, durationSeconds: number) {
	const settings = await getAppSettings()
	const template = settings.adsAlertTemplate || 'Ad break of $(duration) seconds is starting in $(time)!'
	const ctx = createTemplateContext(channelName)
	const rendered = await renderCustomTemplate(template, ctx, {
		time: timeText,
		duration: durationSeconds,
	})
	botLogger.info({ message: rendered }, '[Ads Engine] Posting upcoming ad warning')
	await sendRawChatMessage(channelName, rendered)
}

export function startAdsEngine() {
	if (adsIntervalId) {
		return
	}

	botLogger.info('[Ads Engine] Starting automated ads schedule monitor loop...')
	adsIntervalId = setInterval(executeAdsCheck, 60000)
	adsIntervalId.unref()
}

export function stopAdsEngine() {
	if (adsIntervalId) {
		clearInterval(adsIntervalId)
		adsIntervalId = null
		botLogger.info('[Ads Engine] Automated ads schedule monitor loop stopped.')
	}
}

// Test helper to reset warnings
export function resetAdsEngineState() {
	adAlertState = null
}
