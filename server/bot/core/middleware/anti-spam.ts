import type { CommandMiddleware } from '../types'
import process from 'node:process'
import { botLogger } from '~~/server/utils/logger'
import { checkIsBotMod } from '../utils'

const botMessageTimestamps: number[] = []
const ANTI_SPAM_MIN_GAP_MS = 200
let lastCommandExecutionTime = 0

/**
 * Tracks outbound bot messages to keep our rate limit counter accurate.
 */
export function trackOutboundMessage(): void {
	botMessageTimestamps.push(Date.now())
}

/**
 * Enforces strict minimum spacing and rolling 30-second window rate limit caps.
 */
export const antiSpamMiddleware: CommandMiddleware = async (ctx, next) => {
	if (process.env.NODE_ENV === 'test') {
		await next()
		return
	}

	const now = Date.now()

	// Enforce absolute minimum execution gap
	if (now - lastCommandExecutionTime < ANTI_SPAM_MIN_GAP_MS) {
		botLogger.warn({ command: ctx.state.trigger }, 'Command execution throttled by global anti-spam gap')
		return // Silent drop
	}

	// Enforce rolling 30-second window rate limit
	while (botMessageTimestamps.length > 0 && botMessageTimestamps[0]! < now - 30000) {
		botMessageTimestamps.shift()
	}

	const outboundCount = botMessageTimestamps.length

	// Enforce rate-limit threshold for the bot account itself, not the triggering chatter.
	const isBotMod = await checkIsBotMod()
	const limitThreshold = isBotMod ? 80 : 18

	if (outboundCount >= limitThreshold) {
		botLogger.error(
			{ outboundCount, limitThreshold, command: ctx.state.trigger },
			'Twitch rate-limit protection active. Dropping command execution.',
		)
		if (outboundCount === limitThreshold) {
			await ctx.reply('Bot is replying too quickly. Rate limit safeguard active.')
		}
		return
	}

	lastCommandExecutionTime = now
	await next()
}
