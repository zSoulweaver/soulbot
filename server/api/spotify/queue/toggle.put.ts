import { db } from '~~/server/database'
import { settings } from '~~/server/database/schema'
import { requireUserRole } from '~~/server/utils/auth'
import { sendChannelChatMessage } from '~~/server/utils/chat'
import { getAppSettings, refreshAppSettingsCache } from '~~/server/utils/settings'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'caster')
	const appSettings = await getAppSettings()
	const nextState = !appSettings.spotifySongRequestEnabled

	await db.insert(settings)
		.values({
			key: 'spotify.sr.enabled',
			value: String(nextState),
			updatedAt: new Date(),
		})
		.onConflictDoUpdate({
			target: settings.key,
			set: {
				value: String(nextState),
				updatedAt: new Date(),
			},
		})

	await refreshAppSettingsCache()

	const template = nextState ? 'spotify.sr.enabled' : 'spotify.sr.disabled'
	await sendChannelChatMessage(template)

	return { success: true, enabled: nextState }
})
