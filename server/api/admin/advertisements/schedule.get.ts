import { getStreamInfo } from '~~/server/bot/services/stream'
import { requireUserRole } from '~~/server/utils/auth'
import { getApiClient, getStreamerToken } from '~~/server/utils/twurple'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')

	const streamerToken = await getStreamerToken()
	if (!streamerToken || !streamerToken.userId) {
		return {
			isConfigured: false,
			isOnline: false,
			snoozeCount: 0,
			snoozeRefreshAt: null,
			nextAdAt: null,
			duration: 0,
			lastAdAt: null,
			prerollFreeTime: 0,
		}
	}

	const streamInfo = await getStreamInfo()
	if (!streamInfo.isOnline) {
		return {
			isConfigured: true,
			isOnline: false,
			snoozeCount: 0,
			snoozeRefreshAt: null,
			nextAdAt: null,
			duration: 0,
			lastAdAt: null,
			prerollFreeTime: 0,
		}
	}

	try {
		const api = getApiClient()
		const schedule = await api.channels.getAdSchedule(streamerToken.userId)
		return {
			isConfigured: true,
			isOnline: true,
			snoozeCount: schedule.snoozeCount,
			snoozeRefreshAt: schedule.snoozeRefreshDate ? schedule.snoozeRefreshDate.toISOString() : null,
			nextAdAt: schedule.nextAdDate ? schedule.nextAdDate.toISOString() : null,
			duration: schedule.duration,
			lastAdAt: schedule.lastAdDate ? schedule.lastAdDate.toISOString() : null,
			prerollFreeTime: schedule.prerollFreeTime,
		}
	}
	catch (err: any) {
		return {
			isConfigured: true,
			isOnline: true,
			snoozeCount: 0,
			snoozeRefreshAt: null,
			nextAdAt: null,
			duration: 0,
			lastAdAt: null,
			prerollFreeTime: 0,
			error: err.message || String(err),
		}
	}
})
