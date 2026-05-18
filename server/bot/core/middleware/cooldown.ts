import type { CommandMiddleware } from '../types'

// In-memory command cooldown tracking maps
const globalCooldowns = new Map<string, number>() // commandId -> lastExecutedTimestampMs
const userCooldowns = new Map<string, Map<string, number>>() // commandId -> (userId -> lastExecutedTimestampMs)

/**
 * Validates command global and user cooldowns and updates them upon successful command execution.
 */
export const cooldownMiddleware: CommandMiddleware = async (ctx, next) => {
	const dbCmd = ctx.state.dbCmd
	const command = ctx.state.command
	const userId = ctx.user.id
	const commandId = command.id

	const globalCdSec = dbCmd?.globalCooldown ?? command.globalCooldown ?? 0
	const userCdSec = dbCmd?.userCooldown ?? command.userCooldown ?? 0

	const now = Date.now()

	// Verify Global Cooldown
	if (globalCdSec > 0) {
		const lastRun = globalCooldowns.get(commandId) || 0
		const diff = now - lastRun
		if (diff < globalCdSec * 1000) {
			const remaining = Math.ceil((globalCdSec * 1000 - diff) / 1000)
			return ctx.reply(`This command is on global cooldown. Please wait ${remaining}s.`)
		}
	}

	// Verify User Cooldown
	if (userCdSec > 0) {
		const userCdMap = userCooldowns.get(commandId)
		const lastRun = userCdMap?.get(userId) || 0
		const diff = now - lastRun
		if (diff < userCdSec * 1000) {
			const remaining = Math.ceil((userCdSec * 1000 - diff) / 1000)
			return ctx.reply(`You are using this command too fast. Please wait ${remaining}s.`)
		}
	}

	// Execute Downstream
	await next()

	// Post-Success: Set Cooldown Timestamps
	if (ctx.state.success !== false) {
		const successNow = Date.now()
		if (globalCdSec > 0) {
			globalCooldowns.set(commandId, successNow)
		}
		if (userCdSec > 0) {
			let userCdMap = userCooldowns.get(commandId)
			if (!userCdMap) {
				userCdMap = new Map<string, number>()
				userCooldowns.set(commandId, userCdMap)
			}
			userCdMap.set(userId, successNow)
		}
	}
}
