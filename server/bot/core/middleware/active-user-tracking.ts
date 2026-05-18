import type { ChatMiddleware } from '../types'
import { trackActiveUser } from '~~/server/bot/modules/points/payout'
import { cleanUsername } from '../utils'

/**
 * Registers the user as active inside the points payout module.
 */
export const activeUserTrackingMiddleware: ChatMiddleware = async (event, next) => {
	const userId = event.raw.userInfo.userId
	trackActiveUser(
		userId,
		cleanUsername(event.raw.userInfo.userName),
		event.raw.userInfo.displayName,
	)
	await next()
}
