export default defineEventHandler(async (event) => {
	const { type } = getQuery(event)
	const config = useRuntimeConfig()

	if (type !== 'bot' && type !== 'streamer') {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid account type. Must be "bot" or "streamer".',
		})
	}

	const scopes = type === 'bot'
		? ['chat:read', 'chat:edit', 'whispers:read', 'whispers:edit']
		: [
				'chat:read',
				'chat:edit',
				'channel:moderate',
				'moderation:read',
				'channel:read:subscriptions',
				'channel:manage:broadcast',
			]

	const url = `https://id.twitch.tv/oauth2/authorize?client_id=${config.twitchClientId}&redirect_uri=${encodeURIComponent(config.twitchRedirectUri)}&response_type=code&scope=${encodeURIComponent(scopes.join(' '))}&state=${type}`

	return sendRedirect(event, url)
})
