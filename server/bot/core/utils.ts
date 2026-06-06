import type { HelixUser } from '@twurple/api'
import { botLogger } from '~~/server/utils/logger'
import { getApiClient, getBotToken, getStreamerToken } from '~~/server/utils/twurple'

/**
 * Standardizes a Twitch username by removing a leading '@' and converting to lowercase.
 */
export function cleanUsername(username: string): string {
	return username.replace(/^@/, '').toLowerCase()
}

interface CacheEntry<T> {
	data: T
	expiresAt: number
}

// In-memory cache for Twitch HelixUser lookups
const twitchUserCache = new Map<string, CacheEntry<HelixUser | null>>()

// 1-hour cache for the bot's mod status
let isBotModCached: boolean | null = null
let lastCacheTime = 0
const CACHE_DURATION_MS = 60 * 60 * 1000

/**
 * Returns a cached user result if it exists and has not expired.
 * Returns `undefined` if the cache is empty or expired for this username.
 */
export function getCachedTwitchUser(username: string): HelixUser | null | undefined {
	const cleaned = cleanUsername(username)
	const entry = twitchUserCache.get(cleaned)

	if (entry) {
		if (Date.now() < entry.expiresAt) {
			return entry.data
		}
		// Clean up expired entry
		twitchUserCache.delete(cleaned)
	}

	return undefined
}

/**
 * Caches a Twitch user lookup. Successful lookups expire in 10 minutes,
 * while non-existent users (null) are cached for 5 minutes to prevent rate limit abuse.
 */
export function setCachedTwitchUser(username: string, user: HelixUser | null): void {
	const cleaned = cleanUsername(username)
	const ttl = user ? 10 * 60 * 1000 : 5 * 60 * 1000 // 10 minutes for success, 5 minutes for failure

	twitchUserCache.set(cleaned, {
		data: user,
		expiresAt: Date.now() + ttl,
	})
}

/**
 * Helper to determine if the bot account is modded or the broadcaster in the channel.
 */
export async function checkIsBotMod(): Promise<boolean> {
	const now = Date.now()
	if (isBotModCached !== null && (now - lastCacheTime < CACHE_DURATION_MS)) {
		return isBotModCached
	}

	try {
		const [botToken, streamerToken] = await Promise.all([
			getBotToken(),
			getStreamerToken(),
		])

		if (!botToken || !streamerToken || !botToken.userId || !streamerToken.userId) {
			return false
		}

		// Broadcasters automatically have maximum rate limits
		if (botToken.userId === streamerToken.userId) {
			isBotModCached = true
			lastCacheTime = now
			return true
		}

		const api = getApiClient()
		const isMod = await api.moderation.checkUserMod(streamerToken.userId, botToken.userId)
		isBotModCached = isMod
		lastCacheTime = now
		return isMod
	}
	catch (err) {
		botLogger.error({ err }, 'Failed to check bot mod status from Helix')
		// Fallback to previous cached value if available, otherwise false
		return isBotModCached ?? false
	}
}
