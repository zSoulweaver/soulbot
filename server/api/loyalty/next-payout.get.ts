import { getNextPayoutTime } from '~~/server/bot/modules/points/payout'
import { getStreamInfo } from '~~/server/bot/services/stream'

export default defineEventHandler(async () => {
	const nextTime = getNextPayoutTime()
	const stream = await getStreamInfo()
	return {
		nextPayoutTime: nextTime,
		isOnline: stream.isOnline,
		now: Date.now(),
	}
})
