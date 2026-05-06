import type { ChatMessage } from '@twurple/chat'
import type { z } from 'zod'
import type { CommandContext, CommandPermission } from './types'
import { eq, sql } from 'drizzle-orm'
import { db } from '~~/server/database'
import { commands, users } from '~~/server/database/schema'
import { registry } from './registry'
import { templateRegistry } from './templates'

export async function handleMessage(channel: string, user: string, message: string, raw: ChatMessage) {
	if (!message.startsWith('!'))
		return

	const parts = message.slice(1).split(/\s+/)
	const trigger = parts[0]?.toLowerCase()
	if (!trigger)
		return

	const resolved = registry.resolveTrigger(trigger)
	if (!resolved)
		return

	const command = registry.getCommand(resolved.commandId)
	if (!command)
		return

	// 1. Check if enabled in DB
	const [dbCmd] = await db.select().from(commands).where(eq(commands.id, command.id))
	if (dbCmd && !dbCmd.enabled)
		return

	const chatClient = await getChatClient()
	if (!chatClient)
		return

	const ctx: CommandContext = {
		user: {
			id: raw.userInfo.userId,
			name: raw.userInfo.userName,
			displayName: raw.userInfo.displayName,
		},
		channel,
		reply: async (textOrTemplate: string, ...args: any[]) => {
			const data = args[0]
			const text = data
				? templateRegistry.render(textOrTemplate, data)
				: textOrTemplate
			await chatClient.say(channel, `@${raw.userInfo.displayName}, ${text}`)
		},
		say: async (textOrTemplate: string, ...args: any[]) => {
			const data = args[0]
			const text = data
				? templateRegistry.render(textOrTemplate, data)
				: textOrTemplate
			await chatClient.say(channel, text)
		},
		raw,
	}

	// 2. Permission Check
	if (!hasPermission(raw, command.permission)) {
		botLogger.warn({
			command: trigger,
			user: raw.userInfo.userName,
			userId: raw.userInfo.userId,
			channel,
			requiredPermission: command.permission,
			originalMessage: message,
		}, 'Command permission denied')
		return
	}

	// 3. Subcommand Resolution
	let finalHandler = command.handler
	let finalArgs = parts.slice(1)
	let finalPermission = command.permission
	let finalZodSchema = command.args as z.ZodTypeAny | undefined
	let finalUsage = command.usage

	// If it's an alias pointing to a subcommand, or if the first arg is a subcommand
	const potentialSubcommand = resolved?.subcommand || finalArgs[0]?.toLowerCase() || null

	if (potentialSubcommand && command.subcommands?.[potentialSubcommand]) {
		const sub = command.subcommands[potentialSubcommand]
		finalHandler = sub.handler
		// If it was a natural subcommand (e.g. !points add), shift the args
		if (!resolved?.subcommand) {
			finalArgs = finalArgs.slice(1)
		}
		finalPermission = sub.permission
		finalZodSchema = sub.args as z.ZodTypeAny | undefined
		finalUsage = sub.usage

		if (!hasPermission(raw, finalPermission)) {
			botLogger.warn({
				command: trigger,
				subcommand: potentialSubcommand,
				user: raw.userInfo.userName,
				userId: raw.userInfo.userId,
				channel,
				requiredPermission: finalPermission,
				originalMessage: message,
			}, 'Command permission denied')
			return
		}
	}

	// 4. Argument Parsing (Zod)
	let parsedArgs: any = finalArgs
	if (finalZodSchema) {
		const result = finalZodSchema.safeParse(finalArgs)
		if (!result.success) {
			const issue = result.error.issues[0]
			if (!issue) {
				return ctx.reply('Incorrect usage, Invalid arguments.')
			}

			let message = issue.message

			// Improve tuple error messages
			if (issue.code === 'too_small' && ((issue as any).origin === 'array' || (issue as any).type === 'array')) {
				// Try to find which index is missing
				const def = (finalZodSchema as any)._def
				const items = def?.items || []
				const expectedCount = items.length
				const receivedCount = finalArgs.length

				if (receivedCount < expectedCount) {
					const missingItem = items[receivedCount]
					const description = missingItem?.description || missingItem?._def?.description
					message = description ? `missing ${description}` : 'missing required arguments'
				}
				else {
					message = 'missing required arguments'
				}
			}
			else if (issue.path.length === 1 && typeof issue.path[0] === 'number') {
				// Validation error at a specific tuple index
				const index = issue.path[0]
				const def = (finalZodSchema as any)._def
				const items = def?.items || []
				const item = items[index]
				const description = item?.description || item?._def?.description
				if (description) {
					message = `${description} ${message}`
				}
			}

			const usageText = finalUsage ? ` | Usage: \`${finalUsage}\`` : ''
			botLogger.warn({
				command: trigger,
				subcommand: potentialSubcommand,
				user: raw.userInfo.userName,
				userId: raw.userInfo.userId,
				channel,
				error: message,
				originalMessage: message,
			}, 'Command validation error')
			return ctx.reply(`Incorrect usage, ${message}.${usageText}`)
		}
		parsedArgs = result.data
	}

	// 5. Cost Check (Simplistic for now)
	if (dbCmd && dbCmd.cost > 0) {
		const [dbUser] = await db.select().from(users).where(eq(users.id, ctx.user.id))
		if (!dbUser || dbUser.points < dbCmd.cost) {
			botLogger.info({
				command: trigger,
				user: raw.userInfo.userName,
				userId: raw.userInfo.userId,
				channel,
				cost: dbCmd.cost,
				currentPoints: dbUser?.points || 0,
			}, 'Command rejected due to insufficient points')
			return ctx.reply(`You need ${dbCmd.cost} points to use this command.`)
		}
	}

	// 6. Execute
	try {
		const start = Date.now()
		await finalHandler(ctx, parsedArgs)
		const duration = Date.now() - start

		botLogger.info({
			command: trigger,
			subcommand: potentialSubcommand,
			user: raw.userInfo.userName,
			userId: raw.userInfo.userId,
			channel,
			args: parsedArgs,
			durationMs: duration,
			originalMessage: message,
		}, `Command executed successfully: ${command.id}`)

		// 7. Post-success: Deduct cost
		if (dbCmd && dbCmd.cost > 0) {
			await db.update(users)
				.set({ points: sql`${users.points} - ${dbCmd.cost}` })
				.where(eq(users.id, ctx.user.id))
		}
	}
	catch (err) {
		botLogger.error({
			err,
			command: trigger,
			subcommand: potentialSubcommand,
			user: raw.userInfo.userName,
			userId: raw.userInfo.userId,
			channel,
			args: parsedArgs,
			originalMessage: message,
		}, `Error executing command ${command.id}`)
	}
}

function hasPermission(msg: ChatMessage, level: CommandPermission): boolean {
	if (level === 'everyone')
		return true
	if (msg.userInfo.isBroadcaster)
		return true
	if (level === 'subscriber' && (msg.userInfo.isSubscriber || msg.userInfo.isVip || msg.userInfo.isMod))
		return true
	if (level === 'vip' && (msg.userInfo.isVip || msg.userInfo.isMod))
		return true
	if (level === 'moderator' && msg.userInfo.isMod)
		return true
	return false
}
