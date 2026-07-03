import type { CommandHandler } from '../../../core/types'
import { botLogger } from '~~/server/utils/logger'
import { getApiClient, getStreamerToken } from '~~/server/utils/twurple'

export const handleSnooze: CommandHandler = async (ctx) => {
	try {
		const streamerToken = await getStreamerToken()
		if (!streamerToken || !streamerToken.userId) {
			return ctx.reply('ads.snooze.error', { error: 'Broadcaster not configured.' })
		}

		const api = getApiClient()
		let snoozeCount = 0
		await api.asUser(streamerToken.userId, async (userCtx) => {
			const res = await userCtx.channels.snoozeNextAd(streamerToken.userId!)
			snoozeCount = res.snoozeCount
		})

		return ctx.reply('ads.snooze.success', { snoozeCount })
	}
	catch (err: any) {
		botLogger.error({ err }, 'Failed to snooze upcoming ad break')
		return ctx.reply('ads.snooze.error', { error: err.message || String(err) })
	}
}
