import { requireUserRole } from '~~/server/utils/auth'
import { getApiClient, getStreamerToken } from '~~/server/utils/twurple'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')
	const streamerToken = await getStreamerToken()
	if (!streamerToken || !streamerToken.userId) {
		return {
			isOnline: false,
			title: 'Offline',
			gameName: 'Unknown',
			viewers: 0,
			uptime: 0,
			tags: [] as string[],
		}
	}

	const api = getApiClient()
	try {
		const stream = await api.streams.getStreamByUserId(streamerToken.userId)
		if (stream) {
			const uptime = Date.now() - stream.startDate.getTime()
			return {
				isOnline: true,
				title: stream.title,
				gameName: stream.gameName,
				viewers: stream.viewers,
				uptime,
				tags: stream.tags || [],
			}
		}

		// Stream is offline, fetch channel info to show default titles/categories
		const channelInfo = await api.channels.getChannelInfoById(streamerToken.userId)
		return {
			isOnline: false,
			title: channelInfo?.title || 'No Title',
			gameName: channelInfo?.gameName || 'No Category',
			viewers: 0,
			uptime: 0,
			tags: channelInfo?.tags || [],
		}
	}
	catch {
		return {
			isOnline: false,
			title: 'Twitch API offline/not connected',
			gameName: 'N/A',
			viewers: 0,
			uptime: 0,
			tags: [] as string[],
		}
	}
})
