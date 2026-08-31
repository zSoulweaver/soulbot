import type { ChatMessage } from '@twurple/chat'
import type { CommandContext, CommandMiddleware, CommandPermission, CommandState } from './types'
import { sendRawChatMessage } from '~~/server/utils/chat'
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
import { sanitizeChatText } from './utils'
import { renderCustomTemplate } from './variables-engine'

// Sequential composition of onion execution middlewares
const commandMiddlewares: CommandMiddleware[] = [
	antiSpamMiddleware,
	argumentsMiddleware,
	permissionsMiddleware,
	cooldownMiddleware,
	pointsCostMiddleware,
	handlerExecutionMiddleware,
]

export interface HandleCommandOptions {
	isWhisper?: boolean
}

/**
 * Core command dispatcher. Resolves message triggers and runs the command execution middleware pipeline.
 */
export async function handleCommand(
	channel: string,
	user: string,
	message: string,
	raw: ChatMessage,
	options?: HandleCommandOptions,
): Promise<void> {
	if (!message.startsWith('!'))
		return

	const cleaned = sanitizeChatText(message.slice(1))
	const parts = cleaned ? cleaned.split(/\s+/).filter(Boolean) : []
	const trigger = parts[0]?.toLowerCase()
	if (!trigger)
		return

	const target = registry.resolveTrigger(trigger)
	if (!target)
		return // Silently drop if command trigger is not found or is disabled in the DB

	const chatClient = await getChatClient()
	if (!chatClient)
		return

	const isWhisper = Boolean(options?.isWhisper)

	// Construct standardized state based on target type
	let state: CommandState
	if (target.type === 'core') {
		const { def, config } = target
		state = {
			target,
			commandId: def.id,
			trigger,
			cost: config.cost ?? def.cost ?? 0,
			permission: (config.permission as CommandPermission) || def.permission,
			globalCooldown: config.globalCooldown ?? def.globalCooldown ?? 0,
			userCooldown: config.userCooldown ?? def.userCooldown ?? 0,
			allowWhisper: Boolean(config.allowWhisper ?? def.allowWhisper),
			whisperSilentResponse: Boolean(config.whisperSilentResponse),
			handler: def.handler,
			subcommand: target.subcommand,
			dbCmd: config,
			command: def,
			resolved: target,
		}
	}
	else {
		const { record } = target
		state = {
			target,
			commandId: `custom:${record.id}`,
			trigger: record.trigger,
			cost: record.cost,
			permission: record.permission as CommandPermission,
			globalCooldown: record.globalCooldown,
			userCooldown: record.userCooldown,
			allowWhisper: false,
			whisperSilentResponse: false,
			handler: async (ctx) => {
				const response = await renderCustomTemplate(record.response, ctx)
				if (response) {
					const lines = response.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0)
					await Promise.all(lines.map(line => ctx.say(line)))
				}
			},
			resolved: target,
		}
	}

	const ctx: CommandContext = {
		user: {
			id: raw.userInfo.userId,
			name: raw.userInfo.userName,
			displayName: raw.userInfo.displayName,
		},
		channel,
		isWhisper,
		reply: async (textOrTemplate: string, ...args: any[]) => {
			const isSilent = isWhisper && ctx.state.whisperSilentResponse
			if (isSilent) {
				botLogger.info({ command: trigger, user }, '[Chat Utils] Whisper command executed with chat reply suppressed (silent mode)')
				return
			}
			const data = args[0]
			const text = templateRegistry.get(textOrTemplate)
				? await templateRegistry.renderAsync(textOrTemplate, ctx, data || {})
				: await renderCustomTemplate(textOrTemplate, ctx, data || {})
			trackOutboundMessage()
			await sendRawChatMessage(channel, `@${raw.userInfo.displayName}, ${text}`)
		},
		say: async (textOrTemplate: string, ...args: any[]) => {
			const isSilent = isWhisper && ctx.state.whisperSilentResponse
			if (isSilent) {
				botLogger.info({ command: trigger, user }, '[Chat Utils] Whisper command executed with chat message suppressed (silent mode)')
				return
			}
			const data = args[0]
			const text = templateRegistry.get(textOrTemplate)
				? await templateRegistry.renderAsync(textOrTemplate, ctx, data || {})
				: await renderCustomTemplate(textOrTemplate, ctx, data || {})
			trackOutboundMessage()
			await sendRawChatMessage(channel, text)
		},
		raw,
		rawArgs: parts.slice(1),
		state,
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
		}, `Error executing command middleware pipeline for ${state.commandId}`)
	}
}
