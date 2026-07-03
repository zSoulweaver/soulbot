import { z } from 'zod'
import { requireUserRole } from '~~/server/utils/auth'
import { getApiClient, getStreamerToken } from '~~/server/utils/twurple'

const triggerCommercialSchema = z.object({
	length: z.union([
		z.literal(30),
		z.literal(60),
		z.literal(90),
		z.literal(120),
		z.literal(150),
		z.literal(180),
	]),
})

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')
	const body = await readBody(event)
	const parsed = triggerCommercialSchema.safeParse(body)

	if (!parsed.success) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid commercial duration. Must be 30, 60, 90, 120, 150, or 180 seconds.',
		})
	}

	const streamerToken = await getStreamerToken()
	if (!streamerToken || !streamerToken.userId) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Broadcaster Twitch account is not configured.',
		})
	}

	try {
		const api = getApiClient()
		await api.asUser(streamerToken.userId, async (userCtx) => {
			await userCtx.channels.startChannelCommercial(streamerToken.userId!, parsed.data.length as any)
		})

		return { success: true }
	}
	catch (err: any) {
		throw createError({
			statusCode: 500,
			statusMessage: err.message || 'Failed to start commercial break.',
		})
	}
})
