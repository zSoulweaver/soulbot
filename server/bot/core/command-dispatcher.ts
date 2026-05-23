import type { ChatMessage } from '@twurple/chat'
import type { CommandContext, CommandMiddleware } from './types'
import { botLogger } from '~~/server/utils/logger'
import { getChatClient } from '~~/server/utils/twurple'
import { antiSpamMiddleware, trackOutboundMessage } from './middleware/anti-spam'
import { argumentsMiddleware } from './middleware/arguments'
import { cooldownMiddleware } from './middleware/cooldown'
import { handlerExecutionMiddleware } from './middleware/handler-execution'
import { permissionsMiddleware } from './middleware/permissions'
import { pointsCostMiddleware } from './middleware/points-cost'
import { registry } from './registry'
import { templateRegistry } from './templates'

// Sequential composition of onion execution middlewares
const commandMiddlewares: CommandMiddleware[] = [
	antiSpamMiddleware,
	argumentsMiddleware,
	permissionsMiddleware,
	cooldownMiddleware,
	pointsCostMiddleware,
	handlerExecutionMiddleware,
]

/**
 * Core command dispatcher. Resolves message triggers and runs the command execution middleware pipeline.
 */
export async function handleCommand(channel: string, user: string, message: string, raw: ChatMessage): Promise<void> {
	if (!message.startsWith('!'))
		return

	const parts = message.slice(1).split(/\s+/)
	const trigger = parts[0]?.toLowerCase()
	if (!trigger)
		return

	const resolved = registry.resolveTrigger(trigger)
	if (!resolved)
		return // Silently drop if command trigger is not found or is disabled in the DB

	const command = registry.getCommand(resolved.commandId)
	if (!command)
		return

	const chatClient = await getChatClient()
	if (!chatClient)
		return

	// Initialize state and context, fetching DB config synchronously from registry
	const ctx: CommandContext = {
		user: {
			id: raw.userInfo.userId,
			name: raw.userInfo.userName,
			displayName: raw.userInfo.displayName,
		},
		channel,
		reply: async (textOrTemplate: string, ...args: any[]) => {
			const data = args[0]
			const text = templateRegistry.get(textOrTemplate)
				? templateRegistry.render(textOrTemplate, data || {})
				: textOrTemplate
			trackOutboundMessage()
			await chatClient.say(channel, `@${raw.userInfo.displayName}, ${text}`)
		},
		say: async (textOrTemplate: string, ...args: any[]) => {
			const data = args[0]
			const text = templateRegistry.get(textOrTemplate)
				? templateRegistry.render(textOrTemplate, data || {})
				: textOrTemplate
			trackOutboundMessage()
			await chatClient.say(channel, text)
		},
		raw,
		rawArgs: parts.slice(1),
		state: {
			command,
			resolved,
			trigger,
			dbCmd: registry.getCommandConfig(command.id),
		},
	}

	let index = 0
	const executeNext = async (): Promise<void> => {
		if (index < commandMiddlewares.length) {
			const middleware = commandMiddlewares[index++]
			if (middleware) {
				await middleware(ctx, executeNext)
			}
		}
	}

	try {
		await executeNext()
	}
	catch (err) {
		botLogger.error({
			err,
			command: trigger,
			user: raw.userInfo.userName,
			channel,
			originalMessage: message,
		}, `Error executing command middleware pipeline for ${command.id}`)
	}
}
