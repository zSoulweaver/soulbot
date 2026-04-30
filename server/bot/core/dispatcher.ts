import type { ChatMessage } from '@twurple/chat'
import type { CommandContext, CommandPermission } from './types'
import { type } from 'arktype'
import { eq, sql } from 'drizzle-orm'
import { db } from '../../database'
import { commands, users } from '../../database/schema'
import { getChatClient } from '../../utils/twurple'
import { registry } from './registry'

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
		reply: async (text) => { await chatClient.say(channel, `@${raw.userInfo.displayName}, ${text}`) },
		say: async (text) => { await chatClient.say(channel, text) },
		raw,
	}

	// 2. Permission Check
	if (!hasPermission(raw, command.permission))
		return

	// 3. Subcommand Resolution
	let finalHandler = command.handler
	let finalArgs = parts.slice(1)
	let finalPermission = command.permission
	let finalArktypeSchema = command.args

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
		finalArktypeSchema = sub.args

		if (!hasPermission(raw, finalPermission))
			return
	}

	// 4. Argument Parsing (Arktype)
	let parsedArgs: any = finalArgs
	if (finalArktypeSchema) {
		const out = finalArktypeSchema(finalArgs)
		if (out instanceof type.errors) {
			return ctx.reply(`Usage error: ${out.summary}`)
		}
		parsedArgs = out
	}

	// 5. Cost Check (Simplistic for now)
	if (dbCmd && dbCmd.cost > 0) {
		const [dbUser] = await db.select().from(users).where(eq(users.id, ctx.user.id))
		if (!dbUser || dbUser.points < dbCmd.cost) {
			return ctx.reply(`You need ${dbCmd.cost} points to use this command.`)
		}
	}

	// 6. Execute
	try {
		await finalHandler(ctx, parsedArgs)

		// 7. Post-success: Deduct cost
		if (dbCmd && dbCmd.cost > 0) {
			await db.update(users)
				.set({ points: sql`${users.points} - ${dbCmd.cost}` })
				.where(eq(users.id, ctx.user.id))
		}
	}
	catch (err) {
		console.error(`[Bot] Error executing command ${command.id}:`, err)
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
