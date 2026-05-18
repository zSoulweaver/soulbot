import type { ChatMiddleware } from '../types'
import { handleCommand } from '../command-dispatcher'

/**
 * Directs incoming messages beginning with '!' into our command onion middleware pipeline.
 */
export const commandRouterMiddleware: ChatMiddleware = async (event, next) => {
	if (event.message.startsWith('!')) {
		await handleCommand(event.channel, event.user, event.message, event.raw)
	}
	await next()
}
