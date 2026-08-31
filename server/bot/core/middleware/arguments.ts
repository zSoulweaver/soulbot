import type { z } from 'zod'
import type { CommandMiddleware } from '../types'
import { botLogger } from '~~/server/utils/logger'
import { registry } from '../registry'

/**
 * Resolves potential subcommands, overrides raw arguments, and validates arguments against Zod schemas.
 */
export const argumentsMiddleware: CommandMiddleware = async (ctx, next) => {
	// Custom commands have no subcommands or Zod schemas
	if (ctx.state.target.type === 'custom') {
		ctx.args = ctx.rawArgs
		await next()
		return
	}

	const { def: command, config: rootDbConfig } = ctx.state.target
	const resolved = ctx.state.resolved
	const rawArgs = ctx.rawArgs

	let finalHandler = command.handler
	let finalArgs = rawArgs

	if (resolved.overrideArgs) {
		finalArgs = [...resolved.overrideArgs, ...finalArgs]
	}

	let finalPermission = (rootDbConfig?.permission as any) || command.permission
	let finalZodSchema = command.args as z.ZodTypeAny | undefined
	let finalUsage = command.usage

	// Resolve potential subcommand path recursively
	let currentScope: any = command
	let currentArgs = finalArgs
	const subPath: string[] = []

	// Resolve alias-based direct subcommand jumps (if present)
	if (resolved?.subcommand) {
		const parts = resolved.subcommand.split('.')
		for (const part of parts) {
			if (currentScope.subcommands?.[part]) {
				currentScope = currentScope.subcommands[part]
				subPath.push(part)
			}
			else {
				break
			}
		}
	}
	else {
		// Traverse nested subcommands based on chat arguments
		while (currentArgs[0]) {
			const nextWord = currentArgs[0].toLowerCase()
			const parentPrefix = subPath.length > 0 ? `${command.id}.${subPath.join('.')}` : command.id
			const resolvedKey = registry.resolveSubcommandKey(parentPrefix, nextWord) || nextWord

			if (currentScope.subcommands?.[resolvedKey]) {
				const potentialSubId = `${parentPrefix}.${resolvedKey}`
				const subDbConfig = registry.getCommandConfig(potentialSubId)
				// If this subcommand has been explicitly renamed in the database to a different trigger,
				// the original default code key should no longer trigger it.
				if (subDbConfig && subDbConfig.trigger && subDbConfig.trigger.toLowerCase() !== nextWord) {
					break
				}

				currentScope = currentScope.subcommands[resolvedKey]
				subPath.push(resolvedKey)
				currentArgs = currentArgs.slice(1) // Shift argument
			}
			else {
				break
			}
		}
	}

	if (subPath.length > 0) {
		const subId = `${command.id}.${subPath.join('.')}`
		const subDbConfig = registry.getCommandConfig(subId)

		// Check if subcommand is active in DB
		if (subDbConfig && !subDbConfig.enabled) {
			return
		}

		if (currentScope.handler) {
			finalHandler = currentScope.handler
		}
		finalArgs = currentArgs
		finalPermission = (subDbConfig?.permission as any) || currentScope.permission
		finalZodSchema = currentScope.args as z.ZodTypeAny | undefined
		finalUsage = currentScope.usage

		ctx.state.commandId = subId
		ctx.state.subcommand = subPath.join('.')
		ctx.state.permission = finalPermission
		ctx.state.cost = subDbConfig?.cost ?? currentScope.cost ?? 0
		ctx.state.globalCooldown = subDbConfig?.globalCooldown ?? currentScope.globalCooldown ?? 0
		ctx.state.userCooldown = subDbConfig?.userCooldown ?? currentScope.userCooldown ?? 0
		ctx.state.allowWhisper = Boolean(subDbConfig?.allowWhisper || rootDbConfig?.allowWhisper || currentScope.allowWhisper || command.allowWhisper)
		ctx.state.whisperSilentResponse = Boolean(subDbConfig?.whisperSilentResponse || rootDbConfig?.whisperSilentResponse)

		if (subDbConfig) {
			ctx.state.dbCmd = subDbConfig
		}
	}

	// If invoked via whisper, verify that either the resolved subcommand or root command allows whispers
	if (ctx.isWhisper) {
		const isWhisperAllowed = ctx.state.allowWhisper
		if (!isWhisperAllowed) {
			botLogger.warn({
				command: ctx.state.trigger,
				subcommand: ctx.state.subcommand,
				user: ctx.user.name,
			}, 'Whisper command ignored (allowWhisper is disabled)')
			return
		}
	}

	// Parse arguments using Zod
	let parsedArgs: any = finalArgs
	if (finalZodSchema) {
		const result = finalZodSchema.safeParse(finalArgs)
		if (!result.success) {
			const issue = result.error.issues[0]
			let message = issue?.message || 'missing required arguments'

			// Improve tuple error messages for missing items
			if (issue && issue.code === 'too_small' && ((issue as any).origin === 'array' || (issue as any).type === 'array')) {
				const def = (finalZodSchema as any)._def
				const items = def?.items || []
				const expectedCount = items.length
				const receivedCount = finalArgs.length

				if (receivedCount < expectedCount) {
					const missingItem = items[receivedCount]
					const description = missingItem?.description || missingItem?._def?.description
					message = description ? `missing ${description}` : 'missing required arguments'
				}
			}
			else if (issue && issue.path.length === 1 && typeof issue.path[0] === 'number') {
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
				command: ctx.state.trigger,
				subcommand: ctx.state.subcommand,
				user: ctx.user.name,
				rawArgs: ctx.rawArgs,
				finalArgs,
				zodIssues: result.error.issues,
				error: message,
			}, 'Command validation error')

			return ctx.reply(`Incorrect usage, ${message}.${usageText}`)
		}
		parsedArgs = result.data
	}

	ctx.args = parsedArgs
	ctx.state.handler = finalHandler
	await next()
}
