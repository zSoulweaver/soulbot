import type { CommandHandler } from '../../../core/types'
import { botLogger } from '~~/server/utils/logger'
import { getApiClient, getStreamerToken } from '~~/server/utils/twurple'
import { cleanUsername, getCachedTwitchUser, setCachedTwitchUser } from '../../../core/utils'

async function getTwitchUser(username: string) {
	const cleaned = cleanUsername(username)
	let user = getCachedTwitchUser(cleaned)
	if (user === undefined) {
		const api = getApiClient()
		user = await api.users.getUserByName(cleaned)
		setCachedTwitchUser(cleaned, user)
	}
	return user
}

function formatDuration(ms: number): string {
	if (ms < 0)
		ms = 0
	const seconds = Math.floor(ms / 1000)
	const minutes = Math.floor(seconds / 60)
	const hours = Math.floor(minutes / 60)
	const days = Math.floor(hours / 24)

	const years = Math.floor(days / 365)
	const remainingDays = days % 365
	const remainingMonths = Math.floor(remainingDays / 30)
	const finalDays = remainingDays % 30

	const finalHours = hours % 24
	const finalMinutes = minutes % 60
	const finalSeconds = seconds % 60

	const parts: string[] = []
	if (years > 0)
		parts.push(`${years} year${years === 1 ? '' : 's'}`)
	if (remainingMonths > 0)
		parts.push(`${remainingMonths} month${remainingMonths === 1 ? '' : 's'}`)
	if (finalDays > 0)
		parts.push(`${finalDays} day${finalDays === 1 ? '' : 's'}`)
	if (finalHours > 0)
		parts.push(`${finalHours} hour${finalHours === 1 ? '' : 's'}`)
	if (finalMinutes > 0)
		parts.push(`${finalMinutes} minute${finalMinutes === 1 ? '' : 's'}`)
	if (finalSeconds > 0 || parts.length === 0)
		parts.push(`${finalSeconds} second${finalSeconds === 1 ? '' : 's'}`)

	return parts.slice(0, 3).join(', ')
}

export const handleFollowage: CommandHandler = async (ctx, [targetUsername]) => {
	const callerUsername = cleanUsername(ctx.user.name)
	const target = targetUsername ? cleanUsername(targetUsername) : callerUsername
	const isSelf = target === callerUsername

	try {
		const streamerToken = await getStreamerToken()
		if (!streamerToken || !streamerToken.userId) {
			botLogger.warn('Broadcaster token not found or not initialized; cannot check followage')
			return
		}

		const targetUser = await getTwitchUser(target)
		if (!targetUser) {
			return ctx.reply('twitch.followage.user-not-found', { target: targetUsername || target })
		}

		const api = getApiClient()
		const followResult = await api.channels.getChannelFollowers(streamerToken.userId, targetUser.id)
		const follow = followResult.data[0]

		if (!follow) {
			if (isSelf) {
				return ctx.reply('twitch.followage.not-following-self')
			}
			else {
				return ctx.reply('twitch.followage.not-following', { target: targetUser.displayName })
			}
		}

		const durationMs = Date.now() - follow.followDate.getTime()
		const duration = formatDuration(durationMs)

		if (isSelf) {
			return ctx.reply('twitch.followage.success-self', { duration })
		}
		else {
			return ctx.reply('twitch.followage.success', { target: targetUser.displayName, duration })
		}
	}
	catch (err) {
		botLogger.error({ err, target }, 'Error retrieving followage details')
	}
}
