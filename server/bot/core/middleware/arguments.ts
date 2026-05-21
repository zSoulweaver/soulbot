import type { z } from 'zod'
import type { CommandMiddleware } from '../types'
import { botLogger } from '~~/server/utils/logger'
import { registry } from '../registry'

/**
 * Resolves potential subcommands, overrides raw arguments, and validates arguments against Zod schemas.
 */
export const argumentsMiddleware: CommandMiddleware = async (ctx, next) => {
	const command = ctx.state.command
	const resolved = ctx.state.resolved
	const rawArgs = ctx.rawArgs

	let finalHandler = command.handler
	let finalArgs = rawArgs

	if (resolved.overrideArgs) {
		finalArgs = [...resolved.overrideArgs, ...finalArgs]
	}

	const rootDbConfig = registry.getCommandConfig(command.id)
	let finalPermission = rootDbConfig?.permission || command.permission
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
		finalPermission = subDbConfig?.permission || currentScope.permission
		finalZodSchema = currentScope.args as z.ZodTypeAny | undefined
		finalUsage = currentScope.usage
		ctx.state.subcommand = subPath.join('.')

		if (subDbConfig) {
			ctx.state.dbCmd = subDbConfig
		}
	}

	// Store permission level downstream
	ctx.state.permission = finalPermission

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
