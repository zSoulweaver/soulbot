import { PollingEngine } from '~~/server/bot/core/polling-engine'
import { templateRegistry } from '~~/server/bot/core/templates'
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

export const adsEngine = new PollingEngine({
	name: 'advertisements',
	intervalMs: 60000,
	action: () => executeAdsCheck(),
})

export async function executeAdsCheck() {
	try {
		const streamerToken = await getStreamerToken()
		if (!streamerToken || !streamerToken.userId) {
			return
		}

		// Only check if stream is online
		const stream = await getStreamInfo()
		if (!stream.isOnline) {
			adAlertState = null
			return
		}

		const settings = await getAppSettings()
		if (!settings.adsAlertsEnabled) {
			return
		}

		const channelName = await getStreamerChannelName()
		if (!channelName) {
			return
		}

		const userId = streamerToken.userId
		const api = getApiClient()
		const schedule = await api.asUser(userId, ctx => ctx.channels.getAdSchedule(userId))

		if (!schedule || !schedule.nextAdDate) {
			return
		}

		const nextAdTimestamp = schedule.nextAdDate.getTime()
		const now = Date.now()
		const secondsRemaining = Math.round((nextAdTimestamp - now) / 1000)

		// Reset state if nextAdTimestamp changed significantly (> 60 seconds diff from recorded nextAdTime)
		if (!adAlertState || Math.abs(adAlertState.nextAdTime - nextAdTimestamp) > 60000) {
			adAlertState = {
				nextAdTime: nextAdTimestamp,
				warned5m: false,
				warned3m: false,
				warned1m: false,
			}
		}

		// 5 minute warning (between 4m 30s and 5m 30s)
		if (settings.adsAlert5mEnabled && !adAlertState.warned5m && secondsRemaining <= 300 && secondsRemaining > 240) {
			adAlertState.warned5m = true
			await sendAdAlert(channelName, '5 minutes', schedule.duration)
		}

		// 3 minute warning (between 2m 30s and 3m 30s)
		if (settings.adsAlert3mEnabled && !adAlertState.warned3m && secondsRemaining <= 180 && secondsRemaining > 120) {
			adAlertState.warned3m = true
			await sendAdAlert(channelName, '3 minutes', schedule.duration)
		}

		// 1 minute warning (between 30s and 1m 30s)
		if (settings.adsAlert1mEnabled && !adAlertState.warned1m && secondsRemaining <= 60 && secondsRemaining > 0) {
			adAlertState.warned1m = true
			await sendAdAlert(channelName, '1 minute', schedule.duration)
		}
	}
	catch (err) {
		botLogger.error({ err }, '[Ads Engine] Error checking Twitch ad schedule')
	}
}

async function sendAdAlert(channelName: string, timeText: string, durationSeconds: number) {
	const template = templateRegistry.get('ads.alert')?.template || 'Ad break of $(duration) seconds is starting in $(time)!'
	const ctx = createTemplateContext(channelName)
	const rendered = await renderCustomTemplate(template, ctx, {
		time: timeText,
		duration: durationSeconds,
	})
	botLogger.info({ message: rendered }, '[Ads Engine] Posting upcoming ad warning')
	await sendRawChatMessage(channelName, rendered)
}

export function startAdsEngine() {
	adsEngine.start()
}

export function stopAdsEngine() {
	adsEngine.stop()
}

// Test helper to reset warnings
export function resetAdsEngineState() {
	adAlertState = null
}
