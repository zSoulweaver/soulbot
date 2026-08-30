import { z } from 'zod'
import { discordSettings } from '~~/server/settings'
import { requireUserRole } from '~~/server/utils/auth'

const saveDiscordEventsSchema = z.object({
	discordEventJoinEnabled: z.boolean(),
	discordEventJoinChannelId: z.string().max(100, 'Join alert channel ID is too long'),
	discordEventJoinTemplate: z.string().max(500, 'Join alert template is too long'),

	discordRolesAutoBestowEnabled: z.boolean(),
	discordRolesAutoBestowRoles: z.string().max(500, 'Auto bestow roles string is too long'),

	discordEventLeaveEnabled: z.boolean(),
	discordEventLeaveChannelId: z.string().max(100, 'Leave alert channel ID is too long'),
	discordEventLeaveTemplate: z.string().max(500, 'Leave alert template is too long'),
})

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'caster')
	const body = await readBody(event)
	const parsed = saveDiscordEventsSchema.safeParse(body)

	if (!parsed.success) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid Discord event settings data',
			data: parsed.error.format(),
		})
	}

	const d = parsed.data

	await discordSettings.update({
		eventJoinEnabled: d.discordEventJoinEnabled,
		eventJoinChannelId: d.discordEventJoinChannelId,
		eventJoinTemplate: d.discordEventJoinTemplate,
		rolesAutoBestowEnabled: d.discordRolesAutoBestowEnabled,
		rolesAutoBestowRoles: d.discordRolesAutoBestowRoles,
		eventLeaveEnabled: d.discordEventLeaveEnabled,
		eventLeaveChannelId: d.discordEventLeaveChannelId,
		eventLeaveTemplate: d.discordEventLeaveTemplate,
	})

	return { success: true }
})
