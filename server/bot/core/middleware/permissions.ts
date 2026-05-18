import type { ChatMessage } from '@twurple/chat'
import type { CommandMiddleware, CommandPermission } from '../types'
import { botLogger } from '~~/server/utils/logger'

/**
 * Validates message sender privileges against final command permission requirements.
 */
export const permissionsMiddleware: CommandMiddleware = async (ctx, next) => {
	const requiredPermission = ctx.state.permission as CommandPermission

	if (!hasPermission(ctx.raw, requiredPermission)) {
		botLogger.warn({
			command: ctx.state.trigger,
			subcommand: ctx.state.subcommand,
			user: ctx.user.name,
			requiredPermission,
		}, 'Command permission denied')
		return // Silent drop
	}

	await next()
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
