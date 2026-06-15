import { z } from 'zod'
import { requireUserRole } from '~~/server/utils/auth'
import { updateUserWatchTime } from '../../../bot/modules/watchtime/service'

const bodySchema = z.object({
	amount: z.number(),
	mode: z.enum(['add', 'set']).default('add'),
})

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')
	const username = getRouterParam(event, 'username')
	if (!username) {
		throw createError({ statusCode: 400, statusMessage: 'Username is required' })
	}

	const body = await readValidatedBody(event, bodySchema.safeParse)

	if (!body.success) {
		throw createError({ statusCode: 400, statusMessage: 'Invalid body' })
	}

	const dbUser = await updateUserWatchTime(username, body.data.amount, body.data.mode)

	if (!dbUser) {
		throw createError({ statusCode: 404, statusMessage: 'User not found' })
	}

	return { watchTime: dbUser.watchTime }
})
