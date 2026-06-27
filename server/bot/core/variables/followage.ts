import { cleanUsername, getCachedTwitchUser, setCachedTwitchUser } from '~~/server/bot/core/utils'
import { botLogger } from '~~/server/utils/logger'
import { getApiClient, getStreamerToken } from '~~/server/utils/twurple'
import { defineCommandVariable } from '../define-command-variable'

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

export const followageVariable = defineCommandVariable({
	name: 'followage',
	description: 'Returns how long the user or target has been following the channel.',
	examples: [
		{ syntax: '$(followage)', description: 'Checks the followage of the sender.' },
		{ syntax: '$(followage username)', description: 'Checks the followage of the specified username.' },
	],
	resolve: async (args, ctx, cache) => {
		const inputTarget = args[0] || ctx.rawArgs[0]
		const target = inputTarget ? cleanUsername(inputTarget) : cleanUsername(ctx.user.name)

		const cacheKey = `followage:${target}`
		if (cache[cacheKey] !== undefined) {
			return cache[cacheKey]
		}

		try {
			const streamerToken = await getStreamerToken()
			if (!streamerToken || !streamerToken.userId) {
				return '[Broadcaster token not found]'
			}

			const targetUser = await getTwitchUser(target)
			if (!targetUser) {
				const res = 'user not found'
				cache[cacheKey] = res
				return res
			}

			const api = getApiClient()
			const followResult = await api.channels.getChannelFollowers(streamerToken.userId, targetUser.id)
			const follow = followResult.data[0]

			if (!follow) {
				const res = 'is not following this channel'
				cache[cacheKey] = res
				return res
			}

			const durationMs = Date.now() - follow.followDate.getTime()
			const duration = formatDuration(durationMs)
			const res = `has been following for ${duration}`

			cache[cacheKey] = res
			return res
		}
		catch (err) {
			botLogger.error({ err, target }, 'Error resolving followage variable')
			return '[Error checking followage]'
		}
	},
})
