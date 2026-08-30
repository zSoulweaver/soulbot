import { z } from 'zod'
import { discordSettings } from '~~/server/settings'
import { requireUserRole } from '~~/server/utils/auth'
import { startDiscord, stopDiscord } from '~~/server/utils/discord'

const saveDiscordSettingsSchema = z.object({
	discordEnabled: z.boolean(),
	discordGuildId: z.string().max(100, 'Guild ID is too long'),
	discordModerationLogEnabled: z.boolean().optional(),
	discordModerationLogChannelId: z.string().max(100, 'Moderation log channel ID is too long').optional(),
})

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'caster')
	const body = await readBody(event)
	const parsed = saveDiscordSettingsSchema.safeParse(body)

	if (!parsed.success) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid Discord settings data',
			data: parsed.error.format(),
		})
	}

	const d = parsed.data

	if (d.discordEnabled && !d.discordGuildId) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Cannot enable Discord integration without a Guild ID configured',
		})
	}

	const updatePayload: Record<string, any> = {
		enabled: d.discordEnabled,
		guildId: d.discordGuildId,
	}

	if (d.discordModerationLogEnabled !== undefined) {
		updatePayload.moderationLogEnabled = d.discordModerationLogEnabled
	}
	if (d.discordModerationLogChannelId !== undefined) {
		updatePayload.moderationLogChannelId = d.discordModerationLogChannelId
	}

	await discordSettings.update(updatePayload)

	if (d.discordEnabled) {
		await startDiscord()
	}
	else {
		await stopDiscord()
	}

	return { success: true }
})
