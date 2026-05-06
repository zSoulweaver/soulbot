import { getUserPoints } from '@bot/modules/points/service'

export default defineEventHandler(async (event) => {
	const username = getRouterParam(event, 'username')
	if (!username) {
		throw createError({ statusCode: 400, statusMessage: 'Username is required' })
	}

	const points = await getUserPoints(username)

	if (points === null) {
		throw createError({ statusCode: 404, statusMessage: 'User not found' })
	}

	return { points }
})
