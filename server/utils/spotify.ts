import { Buffer } from 'node:buffer'
import { eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { spotifyTokens } from '~~/server/database/schema'
import { botLogger } from '~~/server/utils/logger'

let cachedSpotifyToken: typeof spotifyTokens.$inferSelect | null = null

export async function getSpotifyToken(forceRefresh = false) {
	if (!cachedSpotifyToken || forceRefresh) {
		const res = await db
			.select()
			.from(spotifyTokens)
			.where(eq(spotifyTokens.id, 'streamer'))
			.then(res => res[0])
		cachedSpotifyToken = res || null
	}
	return cachedSpotifyToken
}

export async function refreshSpotifyToken(): Promise<typeof spotifyTokens.$inferSelect | null> {
	const token = await getSpotifyToken()
	if (!token) {
		botLogger.warn('[Spotify] No token found in DB to refresh')
		return null
	}

	const config = useRuntimeConfig()
	const clientId = config.spotifyClientId
	const clientSecret = config.spotifyClientSecret

	if (!clientId || !clientSecret) {
		botLogger.error('[Spotify] Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET')
		return null
	}

	botLogger.info('[Spotify] Refreshing access token...')
	try {
		const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
		const response = await $fetch<{
			access_token: string
			token_type: string
			scope: string
			expires_in: number
			refresh_token?: string
		}>('https://accounts.spotify.com/api/token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Authorization': `Basic ${credentials}`,
			},
			body: new URLSearchParams({
				grant_type: 'refresh_token',
				refresh_token: token.refreshToken,
			}).toString(),
		})

		const obtainmentTimestamp = Date.now()
		const tokenPayload = {
			accessToken: response.access_token,
			refreshToken: response.refresh_token || token.refreshToken,
			expiresIn: response.expires_in,
			obtainmentTimestamp,
			scope: response.scope || token.scope,
		}

		await db.update(spotifyTokens)
			.set(tokenPayload)
			.where(eq(spotifyTokens.id, 'streamer'))

		cachedSpotifyToken = {
			id: 'streamer',
			...tokenPayload,
		}

		botLogger.info('[Spotify] Token refreshed successfully')
		return cachedSpotifyToken
	}
	catch (err: any) {
		botLogger.error({ err }, '[Spotify] Failed to refresh token')
		return null
	}
}

export async function getValidSpotifyToken() {
	let token = await getSpotifyToken()
	if (!token)
		return null

	const isExpired = token.obtainmentTimestamp + (token.expiresIn! * 1000) - 60000 < Date.now()
	if (isExpired) {
		token = await refreshSpotifyToken()
	}

	return token
}

export interface CurrentlyPlayingTrack {
	title: string
	artist: string
	link: string
	isPlaying: boolean
	albumName?: string
	albumArt?: string
	progressMs?: number
	durationMs?: number
	timestamp?: number
}

let cachedCurrentlyPlaying: {
	data: CurrentlyPlayingTrack | null
	timestamp: number
} | null = null

let rateLimitResetTime = 0

export function isSpotifyRateLimited(): boolean {
	return Date.now() < rateLimitResetTime
}

export function getSpotifyRateLimitRemainingSeconds(): number {
	if (!isSpotifyRateLimited())
		return 0
	return Math.ceil((rateLimitResetTime - Date.now()) / 1000)
}

export async function getCurrentlyPlaying(forceRefresh = false): Promise<CurrentlyPlayingTrack | null> {
	if (isSpotifyRateLimited()) {
		botLogger.warn('[Spotify] Bypassing fetch due to active rate-limit cooldown')
		return cachedCurrentlyPlaying?.data || null
	}

	if (!forceRefresh && cachedCurrentlyPlaying && Date.now() - cachedCurrentlyPlaying.timestamp < 5000) {
		return cachedCurrentlyPlaying.data
	}

	const token = await getValidSpotifyToken()
	if (!token) {
		return null
	}

	try {
		const response = await $fetch<any>('https://api.spotify.com/v1/me/player/currently-playing', {
			headers: {
				Authorization: `Bearer ${token.accessToken}`,
			},
		})

		// Check if response is empty or 204 (status is represented by h3/ofetch or null checking)
		if (!response || !response.item) {
			cachedCurrentlyPlaying = { data: null, timestamp: Date.now() }
			return null
		}

		const item = response.item
		const isPlaying = response.is_playing === true

		const data = {
			title: item.name,
			artist: item.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist',
			link: item.external_urls?.spotify || '',
			isPlaying,
			albumName: item.album?.name,
			albumArt: item.album?.images?.[0]?.url,
			progressMs: response.progress_ms,
			durationMs: item.duration_ms,
			timestamp: Date.now(),
		}

		cachedCurrentlyPlaying = { data, timestamp: Date.now() }
		return data
	}
	catch (err: any) {
		if (err.response?.status === 429) {
			const retryAfterHeader = err.response.headers?.get?.('retry-after') || err.response.headers?.['retry-after']
			const retryAfterSeconds = Number.parseInt(retryAfterHeader || '5', 10)
			rateLimitResetTime = Date.now() + (retryAfterSeconds * 1000)
			botLogger.error(`[Spotify] Received 429. Rate limit active. Throttling requests for ${retryAfterSeconds}s.`)
		}
		else {
			botLogger.error({ err, message: err?.message, stack: err?.stack }, '[Spotify] Failed to fetch currently playing')
		}
		return null
	}
}

export function clearSpotifyTokenCache() {
	cachedSpotifyToken = null
	cachedCurrentlyPlaying = null
	rateLimitResetTime = 0
}
