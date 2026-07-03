import type { CommandHandler } from '../../../core/types'
import { botLogger } from '~~/server/utils/logger'
import { getApiClient, getStreamerToken } from '~~/server/utils/twurple'

export const handleCommercial: CommandHandler = async (ctx, [durationStr]) => {
	try {
		const streamerToken = await getStreamerToken()
		if (!streamerToken || !streamerToken.userId) {
			return ctx.reply('ads.commercial.error', { error: 'Broadcaster not configured.' })
		}

		const duration = durationStr ? Number(durationStr) : 30
		const validDurations = [30, 60, 90, 120, 150, 180]
		if (!validDurations.includes(duration)) {
			return ctx.reply('ads.commercial.error', { error: 'Invalid commercial duration. Choose from: 30, 60, 90, 120, 150, 180.' })
		}

		const api = getApiClient()
		await api.asUser(streamerToken.userId, async (userCtx) => {
			await userCtx.channels.startChannelCommercial(streamerToken.userId!, duration as any)
		})

		return ctx.reply('ads.commercial.success', { duration })
	}
	catch (err: any) {
		botLogger.error({ err }, 'Failed to start commercial break')
		return ctx.reply('ads.commercial.error', { error: err.message || String(err) })
	}
}
