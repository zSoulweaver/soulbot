import { Buffer } from 'node:buffer'
import { randomUUID } from 'node:crypto'
import process from 'node:process'
import { db } from '~~/server/database'
import { spotifyTokens } from '~~/server/database/schema'
import { requireUserRole } from '~~/server/utils/auth'
import { clearSpotifyTokenCache } from '~~/server/utils/spotify'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'caster')

	const query = getQuery(event)
	const config = useRuntimeConfig()
	const clientId = config.spotifyClientId
	const clientSecret = config.spotifyClientSecret

	if (!clientId || !clientSecret) {
		throw createError({
			statusCode: 500,
			statusMessage: 'Spotify client credentials are not configured in environment.',
		})
	}

	if (query.code) {
		const code = query.code as string
		const state = query.state as string

		if (!state) {
			throw createError({
				statusCode: 400,
				statusMessage: 'Missing state parameter in callback.',
			})
		}

		// CSRF validation
		const expectedCsrfToken = getCookie(event, 'spotify_oauth_csrf')
		deleteCookie(event, 'spotify_oauth_csrf')

		if (!expectedCsrfToken || expectedCsrfToken !== state) {
			throw createError({
				statusCode: 400,
				statusMessage: 'Invalid state or CSRF token matching failed.',
			})
		}

		try {
			const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
			const tokenData = await $fetch<{
				access_token: string
				token_type: string
				scope: string
				expires_in: number
				refresh_token: string
			}>('https://accounts.spotify.com/api/token', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					'Authorization': `Basic ${credentials}`,
				},
				body: new URLSearchParams({
					grant_type: 'authorization_code',
					code,
					redirect_uri: config.spotifyRedirectUri,
				}).toString(),
			})

			const obtainmentTimestamp = Date.now()
			const tokenPayload = {
				accessToken: tokenData.access_token,
				refreshToken: tokenData.refresh_token,
				expiresIn: tokenData.expires_in,
				obtainmentTimestamp,
				scope: tokenData.scope,
			}

			await db.insert(spotifyTokens)
				.values({
					id: 'streamer',
					...tokenPayload,
				})
				.onConflictDoUpdate({
					target: spotifyTokens.id,
					set: tokenPayload,
				})

			clearSpotifyTokenCache()

			return sendRedirect(event, '/admin/spotify?success=connected')
		}
		catch (err: any) {
			throw createError({
				statusCode: 500,
				statusMessage: `Failed to exchange code for tokens: ${err.message}`,
			})
		}
	}

	// Generate and store session-bound CSRF token
	const csrfToken = randomUUID()
	setCookie(event, 'spotify_oauth_csrf', csrfToken, {
		maxAge: 600, // 10 minutes
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
	})

	const scopes = [
		'user-read-currently-playing',
		'user-read-playback-state',
		'user-modify-playback-state',
	]

	const url = `https://accounts.spotify.com/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(config.spotifyRedirectUri)}&response_type=code&scope=${encodeURIComponent(scopes.join(' '))}&state=${csrfToken}`

	return sendRedirect(event, url)
})
