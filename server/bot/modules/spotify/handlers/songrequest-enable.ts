import type { CommandHandler } from '~~/server/bot/core/types'
import { db } from '~~/server/database'
import { settings } from '~~/server/database/schema'
import { refreshAppSettingsCache } from '~~/server/utils/settings'

export const handleSongRequestEnable: CommandHandler = async (ctx) => {
	await db.insert(settings)
		.values({
			key: 'spotify.sr.enabled',
			value: 'true',
			updatedAt: new Date(),
		})
		.onConflictDoUpdate({
			target: settings.key,
			set: {
				value: 'true',
				updatedAt: new Date(),
			},
		})

	await refreshAppSettingsCache()
	return ctx.reply('spotify.sr.enabled')
}
