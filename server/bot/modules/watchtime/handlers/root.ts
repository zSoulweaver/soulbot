import type { CommandHandler } from '~~/server/bot/core/types'
import type { TimeArgs } from '../schema'
import { gt, sql } from 'drizzle-orm'
import { cleanUsername } from '~~/server/bot/core/utils'
import { getUserRecord } from '~~/server/bot/services/user'
import { db } from '~~/server/database'
import { users } from '~~/server/database/schema'

function formatTimeSpent(minutes: number): string {
	if (minutes <= 0)
		return '0 minutes'

	const years = Math.floor(minutes / 525600)
	let remaining = minutes % 525600
	const days = Math.floor(remaining / 1440)
	remaining = remaining % 1440
	const hours = Math.floor(remaining / 60)
	const mins = remaining % 60

	const parts: string[] = []
	if (years > 0)
		parts.push(years === 1 ? '1 year' : `${years} years`)
	if (days > 0)
		parts.push(days === 1 ? '1 day' : `${days} days`)
	if (hours > 0)
		parts.push(hours === 1 ? '1 hour' : `${hours} hours`)
	if (mins > 0)
		parts.push(mins === 1 ? '1 minute' : `${mins} minutes`)

	return parts.join(' ')
}

export const handleWatchTimeRoot: CommandHandler<typeof TimeArgs> = async (ctx, [target]) => {
	const username = cleanUsername(target || ctx.user.name)
	const dbUser = await getUserRecord(username)

	if (!dbUser || dbUser.watchTime === 0) {
		if (target) {
			return ctx.reply('watchtime.user-no-time', { target: username })
		}
		return ctx.reply('watchtime.user-no-time-self')
	}

	// Calculate user rank on leaderboard (count users with watch_time > target's watch_time, plus 1)
	const [rankRes] = await db
		.select({ count: sql<number>`count(*)` })
		.from(users)
		.where(gt(users.watchTime, dbUser.watchTime))
	const rank = (rankRes?.count ?? 0) + 1

	const timeString = formatTimeSpent(dbUser.watchTime)

	if (target) {
		return ctx.reply('watchtime.show', {
			target: dbUser.displayName,
			time: timeString,
			rank,
		})
	}

	ctx.reply('watchtime.show-self', {
		time: timeString,
		rank,
	})
}
