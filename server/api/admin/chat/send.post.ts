import { z } from 'zod'
import { requireUserRole } from '~~/server/utils/auth'
import { sendRawChatMessage } from '~~/server/utils/chat'
import { getStreamerChannelName } from '~~/server/utils/twurple'

const sendChatSchema = z.object({
	message: z.string().min(1).max(500),
})

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')
	const body = await readBody(event)
	const parsed = sendChatSchema.safeParse(body)
	if (!parsed.success) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid message content',
			data: parsed.error.format(),
		})
	}
	const channel = await getStreamerChannelName()
	if (!channel) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Broadcaster channel name not configured',
		})
	}
	await sendRawChatMessage(channel, parsed.data.message)
	return { success: true }
})
