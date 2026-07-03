import { requireUserRole } from '~~/server/utils/auth'
import { getApiClient, getStreamerToken } from '~~/server/utils/twurple'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')

	const streamerToken = await getStreamerToken()
	if (!streamerToken || !streamerToken.userId) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Broadcaster Twitch account is not configured.',
		})
	}

	try {
		const api = getApiClient()
		let result: any = null
		await api.asUser(streamerToken.userId, async (userCtx) => {
			result = await userCtx.channels.snoozeNextAd(streamerToken.userId!)
		})

		return {
			success: true,
			snoozeCount: result?.snoozeCount ?? 0,
			snoozeRefreshAt: result?.snoozeRefreshDate ? result.snoozeRefreshDate.toISOString() : null,
			nextAdAt: result?.nextAdDate ? result.nextAdDate.toISOString() : null,
		}
	}
	catch (err: any) {
		throw createError({
			statusCode: 500,
			statusMessage: err.message || 'Failed to snooze upcoming ad break.',
		})
	}
})
