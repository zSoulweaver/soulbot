import { z } from 'zod'
import { botSettings } from '~~/server/settings'
import { requireUserRole } from '~~/server/utils/auth'

const saveBotSettingsSchema = z.object({
	chatMode: z.enum(['normal', 'action']),
	muted: z.boolean(),
})

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')
	const body = await readBody(event)
	const parsed = saveBotSettingsSchema.safeParse(body)

	if (!parsed.success) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid bot settings data',
			data: parsed.error.format(),
		})
	}

	await botSettings.update({
		botChatMode: parsed.data.chatMode,
		botMuted: parsed.data.muted,
	})

	return { success: true }
})
