import type { z } from 'zod'
import type { CommandMiddleware } from '../types'
import { botLogger } from '~~/server/utils/logger'

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

	let finalPermission = command.permission
	let finalZodSchema = command.args as z.ZodTypeAny | undefined
	let finalUsage = command.usage

	// Resolve potential subcommand from trigger overrides or first argument
	const potentialSubcommand = resolved?.subcommand || finalArgs[0]?.toLowerCase() || null

	if (potentialSubcommand && command.subcommands?.[potentialSubcommand]) {
		const sub = command.subcommands[potentialSubcommand]
		finalHandler = sub.handler

		// If it's a natural subcommand (e.g. !points add), shift the arguments
		if (!resolved?.subcommand) {
			finalArgs = finalArgs.slice(1)
		}

		finalPermission = sub.permission
		finalZodSchema = sub.args as z.ZodTypeAny | undefined
		finalUsage = sub.usage
		ctx.state.subcommand = potentialSubcommand
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
