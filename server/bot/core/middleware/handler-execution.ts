import type { CommandMiddleware } from '../types'
import { botLogger } from '~~/server/utils/logger'

/**
 * Triggers the final resolved command/subcommand handler, tracking runtime metrics.
 */
export const handlerExecutionMiddleware: CommandMiddleware = async (ctx) => {
	const handler = ctx.state.handler
	ctx.state.success = true // Default success flag

	const start = Date.now()
	await handler(ctx, ctx.args)
	const duration = Date.now() - start

	botLogger.info({
		command: ctx.state.trigger,
		subcommand: ctx.state.subcommand,
		user: ctx.user.name,
		userId: ctx.user.id,
		args: ctx.args,
		durationMs: duration,
	}, `Command executed successfully: ${ctx.state.commandId}`)
}
