import { z } from 'zod'
import { requireUserRole } from '~~/server/utils/auth'
import { requestSong, SongRequestError } from '~~/server/utils/songrequest'

const submitRequestSchema = z.object({
	link: z.string().min(1, 'Spotify link is required'),
})

export default defineEventHandler(async (event) => {
	const user = await requireUserRole(event)
	const body = await readBody(event)
	const parsed = submitRequestSchema.safeParse(body)

	if (!parsed.success) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Spotify link is required',
		})
	}

	try {
		const isModOrAbove = user.role === 'caster' || user.role === 'admin' || user.role === 'moderator'
		const { track } = await requestSong({
			linkOrQuery: parsed.data.link,
			user: {
				id: user.id,
				username: user.username,
				displayName: user.displayName,
				isModOrAbove,
			},
		})
		return { success: true, track }
	}
	catch (err: any) {
		if (err instanceof SongRequestError) {
			throw createError({
				statusCode: err.statusCode,
				statusMessage: err.message,
			})
		}
		throw err
	}
})
