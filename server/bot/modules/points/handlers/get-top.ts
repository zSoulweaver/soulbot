import type { CommandHandler } from '~~/server/bot/core/types'
import type { PointsGetTopArgs } from '../schema'
import { desc, gt } from 'drizzle-orm'
import { db } from '~~/server/database'
import { users } from '~~/server/database/schema'
import { getAppSettingsSync } from '~~/server/utils/settings'

export const handlePointsGetTop: CommandHandler<typeof PointsGetTopArgs> = async (ctx, [countVal]) => {
	const count = Math.min(Math.max(countVal || 5, 1), 10)

	const topEarners = await db
		.select()
		.from(users)
		.where(gt(users.points, 0))
		.orderBy(desc(users.points))
		.limit(count)

	if (!topEarners || topEarners.length === 0) {
		return ctx.reply('points.get-top-empty')
	}

	const settings = getAppSettingsSync()

	const list = topEarners
		.map((u, i) => {
			const currency = u.points === 1 ? settings.currencyName : settings.currencyNamePlural
			return `#${i + 1} ${u.displayName} (${u.points} ${currency})`
		})
		.join(', ')

	ctx.reply('points.get-top', {
		count,
		list,
	})
}
