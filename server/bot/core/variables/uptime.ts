import { getStreamInfo } from '~~/server/bot/services/stream'
import { defineCommandVariable } from '../define-command-variable'

function formatSeconds(totalSeconds: number): string {
	const hours = Math.floor(totalSeconds / 3600)
	const minutes = Math.floor((totalSeconds % 3600) / 60)
	const seconds = totalSeconds % 60

	const parts: string[] = []
	if (hours > 0)
		parts.push(`${hours} hour${hours === 1 ? '' : 's'}`)
	if (minutes > 0)
		parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`)
	if (seconds > 0 || parts.length === 0)
		parts.push(`${seconds} second${seconds === 1 ? '' : 's'}`)

	return parts.join(', ')
}

export const uptimeVariable = defineCommandVariable({
	name: 'uptime',
	description: 'Returns the current stream uptime.',
	examples: [
		{ syntax: '$(uptime)', description: 'Returns how long the stream has been live for.' },
	],
	resolve: async (_args, _ctx, cache) => {
		if (cache.uptime !== undefined) {
			return cache.uptime
		}

		const info = await getStreamInfo()
		if (!info.isOnline || info.uptime === undefined) {
			const res = 'offline'
			cache.uptime = res
			return res
		}

		const duration = formatSeconds(info.uptime)
		cache.uptime = duration
		return duration
	},
})
