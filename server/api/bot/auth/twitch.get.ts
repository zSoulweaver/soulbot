import { exchangeCode, getTokenInfo } from '@twurple/auth'
import { BOT_OAUTH_SCOPES, STREAMER_OAUTH_SCOPES, STREAMER_OAUTH_VERSION } from '~~/server/config/twitch'
import { db } from '~~/server/database'
import { settings, twitchTokens } from '~~/server/database/schema'
import { refreshAppSettingsCache } from '~~/server/utils/settings'
import { getApiClient, getAuthProvider } from '~~/server/utils/twurple'

export default defineEventHandler(async (event) => {
	const query = getQuery(event)
	const config = useRuntimeConfig()

	if (query.code) {
		const code = query.code as string
		const type = query.state as 'bot' | 'streamer'

		if (!type || (type !== 'bot' && type !== 'streamer')) {
			throw createError({
				statusCode: 400,
				statusMessage: 'Invalid state/type in callback.',
			})
		}

		try {
			const tokenData = await exchangeCode(
				config.twitchClientId,
				config.twitchClientSecret,
				code,
				config.botTwitchRedirectUri,
			)

			// Get user info to store in DB
			const tokenInfo = await getTokenInfo(tokenData.accessToken)
			const userId = tokenInfo.userId

			if (!userId) {
				throw new Error('Could not retrieve user ID from token')
			}

			// Add user to the provider temporarily to use the ApiClient for fetching details
			const provider = getAuthProvider()
			await provider.addUserForToken(tokenData)

			const apiClient = getApiClient()
			const twitchUser = await apiClient.users.getUserById(userId)

			if (!twitchUser) {
				throw new Error('Could not retrieve Twitch user details')
			}

			const tokenPayload = {
				userId,
				userName: twitchUser.name,
				displayName: twitchUser.displayName,
				accessToken: tokenData.accessToken,
				refreshToken: tokenData.refreshToken!,
				expiresIn: tokenData.expiresIn,
				obtainmentTimestamp: tokenData.obtainmentTimestamp,
				scope: JSON.stringify(tokenData.scope),
			}

			// Upsert in DB
			await db.insert(twitchTokens)
				.values({
					accountType: type,
					...tokenPayload,
				})
				.onConflictDoUpdate({
					target: twitchTokens.accountType,
					set: tokenPayload,
				})

			if (type === 'streamer') {
				await db.insert(settings)
					.values({
						key: 'twitch.streamer_token_version',
						value: String(STREAMER_OAUTH_VERSION),
						updatedAt: new Date(),
					})
					.onConflictDoUpdate({
						target: settings.key,
						set: {
							value: String(STREAMER_OAUTH_VERSION),
							updatedAt: new Date(),
						},
					})
				await refreshAppSettingsCache()
			}

			return sendRedirect(event, '/setup')
		}
		catch (err: any) {
			console.error('[Bot Auth Callback] Error:', err)
			throw createError({
				statusCode: 500,
				statusMessage: `Failed to exchange code for tokens: ${err.message}`,
			})
		}
	}

	const type = query.type as string
	if (type !== 'bot' && type !== 'streamer') {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid account type. Must be "bot" or "streamer".',
		})
	}

	const scopes = type === 'bot' ? BOT_OAUTH_SCOPES : STREAMER_OAUTH_SCOPES

	const url = `https://id.twitch.tv/oauth2/authorize?client_id=${config.twitchClientId}&redirect_uri=${encodeURIComponent(config.botTwitchRedirectUri)}&response_type=code&scope=${encodeURIComponent(scopes.join(' '))}&state=${type}`

	return sendRedirect(event, url)
})
