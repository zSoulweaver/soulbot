import { botSettings } from '~~/server/settings'
import { requireUserRole } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')
	const settings = botSettings.get()

	return {
		chatMode: settings.botChatMode,
		muted: settings.botMuted,
	}
})
