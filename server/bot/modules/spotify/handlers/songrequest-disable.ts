import type { CommandHandler } from '~~/server/bot/core/types'
import { db } from '~~/server/database'
import { settings } from '~~/server/database/schema'
import { refreshAppSettingsCache } from '~~/server/utils/settings'

export const handleSongRequestDisable: CommandHandler = async (ctx) => {
	await db.insert(settings)
		.values({
			key: 'spotify.sr.enabled',
			value: 'false',
			updatedAt: new Date(),
		})
		.onConflictDoUpdate({
			target: settings.key,
			set: {
				value: 'false',
				updatedAt: new Date(),
			},
		})

	await refreshAppSettingsCache()
	return ctx.reply('spotify.sr.disabled')
}
