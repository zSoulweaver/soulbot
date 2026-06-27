import { randomUUID } from 'node:crypto'
import process from 'node:process'
import { exchangeCode, getTokenInfo } from '@twurple/auth'
import { BOT_OAUTH_SCOPES, BOT_OAUTH_VERSION, STREAMER_OAUTH_SCOPES, STREAMER_OAUTH_VERSION } from '~~/server/config/twitch'
import { db } from '~~/server/database'
import { settings, twitchTokens, users } from '~~/server/database/schema'
import { requireUserRole } from '~~/server/utils/auth'
import { refreshAppSettingsCache } from '~~/server/utils/settings'
import { getApiClient, getAuthProvider, getBotToken, getStreamerToken } from '~~/server/utils/twurple'

export default defineEventHandler(async (event) => {
	const query = getQuery(event)
	const config = useRuntimeConfig()

	// Check onboarding status for defense-in-depth security
	const existingTokens = await db.select().from(twitchTokens)
	const hasBot = existingTokens.some(t => t.accountType === 'bot')
	const hasStreamer = existingTokens.some(t => t.accountType === 'streamer')
	const isOnboarded = hasBot && hasStreamer

	if (isOnboarded) {
		const session = await getUserSession(event)
		const user = session?.user
		const botToken = await getBotToken()
		const isBot = user && botToken && user.id === botToken.userId
		if (!isBot) {
			await requireUserRole(event, 'caster')
		}
	}

	if (query.code) {
		const code = query.code as string
		const stateStr = query.state as string

		if (!stateStr) {
			throw createError({
				statusCode: 400,
				statusMessage: 'Missing state parameter in callback.',
			})
		}

		const [type, csrfToken] = stateStr.split(':')

		if (!type || (type !== 'bot' && type !== 'streamer')) {
			throw createError({
				statusCode: 400,
				statusMessage: 'Invalid state/type in callback.',
			})
		}

		// CSRF protection validation
		const expectedCsrfToken = getCookie(event, 'twitch_oauth_csrf')
		deleteCookie(event, 'twitch_oauth_csrf')

		if (!expectedCsrfToken || expectedCsrfToken !== csrfToken) {
			throw createError({
				statusCode: 400,
				statusMessage: 'Invalid state or CSRF token matching failed.',
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

			// Force refresh the token cache
			await getStreamerToken(true)
			await getBotToken(true)

			if (type === 'bot') {
				const now = new Date()
				await db.insert(settings)
					.values({
						key: 'twitch.bot_token_version',
						value: String(BOT_OAUTH_VERSION),
						updatedAt: now,
					})
					.onConflictDoUpdate({
						target: settings.key,
						set: {
							value: String(BOT_OAUTH_VERSION),
							updatedAt: now,
						},
					})
				await refreshAppSettingsCache()

				const results = await db.insert(users)
					.values({
						id: userId,
						username: twitchUser.name,
						displayName: twitchUser.displayName,
						image: twitchUser.profilePictureUrl || '',
						role: 'viewer',
						isVip: false,
						isSubscriber: false,
						createdAt: now,
						updatedAt: now,
					})
					.onConflictDoUpdate({
						target: users.id,
						set: {
							username: twitchUser.name,
							displayName: twitchUser.displayName,
							image: twitchUser.profilePictureUrl || '',
							updatedAt: now,
						},
					})
					.returning()

				const dbUser = results[0]
				if (dbUser) {
					await setUserSession(event, {
						user: {
							id: dbUser.id,
							username: dbUser.username,
							displayName: dbUser.displayName,
							image: dbUser.image,
							role: dbUser.role,
							isVip: dbUser.isVip,
							isSubscriber: dbUser.isSubscriber,
						},
						loggedInAt: now.toISOString(),
					})
				}
			}

			if (type === 'streamer') {
				const now = new Date()
				await db.insert(settings)
					.values({
						key: 'twitch.streamer_token_version',
						value: String(STREAMER_OAUTH_VERSION),
						updatedAt: now,
					})
					.onConflictDoUpdate({
						target: settings.key,
						set: {
							value: String(STREAMER_OAUTH_VERSION),
							updatedAt: now,
						},
					})
				await refreshAppSettingsCache()

				// Automatically log in the broadcaster (caster)
				const results = await db.insert(users)
					.values({
						id: userId,
						username: twitchUser.name,
						displayName: twitchUser.displayName,
						image: twitchUser.profilePictureUrl || '',
						role: 'caster',
						isVip: false,
						isSubscriber: false,
						createdAt: now,
						updatedAt: now,
					})
					.onConflictDoUpdate({
						target: users.id,
						set: {
							username: twitchUser.name,
							displayName: twitchUser.displayName,
							image: twitchUser.profilePictureUrl || '',
							role: 'caster',
							updatedAt: now,
						},
					})
					.returning()

				const dbUser = results[0]
				if (dbUser) {
					await setUserSession(event, {
						user: {
							id: dbUser.id,
							username: dbUser.username,
							displayName: dbUser.displayName,
							image: dbUser.image,
							role: dbUser.role,
							isVip: dbUser.isVip,
							isSubscriber: dbUser.isSubscriber,
						},
						loggedInAt: now.toISOString(),
					})
				}
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

	// Generate and store session-bound CSRF token
	const csrfToken = randomUUID()
	setCookie(event, 'twitch_oauth_csrf', csrfToken, {
		maxAge: 600, // 10 minutes
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
	})

	const scopes = type === 'bot' ? BOT_OAUTH_SCOPES : STREAMER_OAUTH_SCOPES
	const state = `${type}:${csrfToken}`
	const url = `https://id.twitch.tv/oauth2/authorize?client_id=${config.twitchClientId}&redirect_uri=${encodeURIComponent(config.botTwitchRedirectUri)}&response_type=code&scope=${encodeURIComponent(scopes.join(' '))}&state=${state}`

	return sendRedirect(event, url)
})
