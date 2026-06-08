import type { CommandHandler } from '../../../core/types'
import { getStreamInfo } from '../../../services/stream'

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

export const handleUptime: CommandHandler = async (ctx) => {
	const info = await getStreamInfo()

	if (!info.isOnline || info.uptime === undefined) {
		return ctx.reply('twitch.uptime.offline')
	}

	const duration = formatSeconds(info.uptime)
	return ctx.reply('twitch.uptime.online', { duration })
}
