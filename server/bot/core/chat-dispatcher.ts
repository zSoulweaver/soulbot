import type { ChatMessageEvent, ChatMiddleware } from './types'
import { botEventBus } from './events'
import { activeUserTrackingMiddleware } from './middleware/active-user-tracking'
import { commandRouterMiddleware } from './middleware/command-router'
import { userTrackingMiddleware } from './middleware/user-tracking'

// Sequence of general chat middlewares
const chatMiddlewares: ChatMiddleware[] = [
	userTrackingMiddleware,
	activeUserTrackingMiddleware,
	commandRouterMiddleware,
]

/**
 * Handles an incoming chat message by routing it through the chat middleware pipeline.
 */
export async function handleChatMessage(event: ChatMessageEvent): Promise<void> {
	// Emit the chat event to internal listeners
	botEventBus.emit('chat', event)

	let index = 0

	const executeNext = async (): Promise<void> => {
		if (index < chatMiddlewares.length) {
			const middleware = chatMiddlewares[index++]
			if (middleware) {
				await middleware(event, executeNext)
			}
		}
	}

	await executeNext()
}
