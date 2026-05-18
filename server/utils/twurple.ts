import { ApiClient } from '@twurple/api'
import { RefreshingAuthProvider } from '@twurple/auth'
import { ChatClient } from '@twurple/chat'
import { eq } from 'drizzle-orm'
import { handleMessage, initBot, registry, templateRegistry } from '../bot'
import { db } from '../database'
import { twitchTokens, users } from '../database/schema'
import { botLogger } from './logger'

let authProviderInstance: RefreshingAuthProvider | null = null
let apiClientInstance: ApiClient | null = null
let chatClientInstance: ChatClient | null = null

export function getAuthProvider() {
	if (authProviderInstance)
		return authProviderInstance

	const config = useRuntimeConfig()

	authProviderInstance = new RefreshingAuthProvider({
		clientId: config.twitchClientId,
		clientSecret: config.twitchClientSecret,
	})

	authProviderInstance.onRefresh(async (userId, newTokenData) => {
		await db.update(twitchTokens)
			.set({
				accessToken: newTokenData.accessToken,
				refreshToken: newTokenData.refreshToken!,
				expiresIn: newTokenData.expiresIn,
				obtainmentTimestamp: newTokenData.obtainmentTimestamp,
				scope: JSON.stringify(newTokenData.scope),
			})
			.where(eq(twitchTokens.userId, userId))
		botLogger.info({ userId }, 'Tokens refreshed')
	})

	return authProviderInstance
}

export async function initTwurple() {
	const provider = getAuthProvider()
	const tokens = await db.select().from(twitchTokens)

	for (const token of tokens) {
		const tokenData = {
			accessToken: token.accessToken,
			refreshToken: token.refreshToken,
			expiresIn: token.expiresIn,
			obtainmentTimestamp: token.obtainmentTimestamp,
			scope: JSON.parse(token.scope),
		}

		if (token.accountType === 'bot') {
			await provider.addUserForToken(tokenData, ['chat'])
		}
		else {
			await provider.addUserForToken(tokenData)
		}
		botLogger.info({ accountType: token.accountType, userId: token.userId }, 'Loaded tokens')
	}

	// Initialize Bot Registry
	initBot()
	await Promise.all([
		registry.syncWithDb(),
		templateRegistry.syncWithDb(),
	])
}

export function getApiClient() {
	if (!apiClientInstance) {
		apiClientInstance = new ApiClient({ authProvider: getAuthProvider() })
	}
	return apiClientInstance
}

export async function getChatClient() {
	if (chatClientInstance)
		return chatClientInstance

	const config = useRuntimeConfig()
	const tokens = await db.select().from(twitchTokens)
	const botToken = tokens.find(t => t.accountType === 'bot')
	const streamerToken = tokens.find(t => t.accountType === 'streamer')

	if (!botToken || !streamerToken)
		return null

	chatClientInstance = new ChatClient({
		authProvider: getAuthProvider(),
		channels: [config.streamerChannel],
		authIntents: ['chat'],
	})

	return chatClientInstance
}

// Memory cache to throttle user DB writes (tracks last seen timestamp)
const lastSeenCache = new Map<string, number>()
// Throttle updates to at most once every 5 minutes
const USER_TRACKING_THROTTLE_MS = 5 * 60 * 1000

export async function startBot() {
	const chat = await getChatClient()
	if (!chat)
		return 'no_tokens'

	if (chat.isConnected)
		return 'already_running'

	chat.onConnect(() => botLogger.info('Connected to Twitch Chat'))
	chat.onDisconnect((manually, reason) => botLogger.warn({ manually, reason: reason?.message }, 'Disconnected from Twitch Chat'))
	chat.onAuthenticationSuccess(() => botLogger.info('Authenticated with Twitch Chat'))
	chat.onAuthenticationFailure((text, retryCount) => botLogger.error({ text, retryCount }, 'Failed to authenticate with Twitch Chat'))

	chat.onMessage(async (channel, userName, message, raw) => {
		const userId = raw.userInfo.userId
		const nowTime = Date.now()
		const lastUpdated = lastSeenCache.get(userId)

		// Only write to the DB if the user hasn't been seen recently
		if (!lastUpdated || (nowTime - lastUpdated) > USER_TRACKING_THROTTLE_MS) {
			const now = new Date()
			try {
				await db.insert(users)
					.values({
						id: userId,
						username: raw.userInfo.userName,
						displayName: raw.userInfo.displayName,
						points: 0,
						firstSeen: nowTime,
						lastSeen: nowTime,
						createdAt: now,
						updatedAt: now,
					})
					.onConflictDoUpdate({
						target: users.id,
						set: {
							username: raw.userInfo.userName,
							displayName: raw.userInfo.displayName,
							lastSeen: nowTime,
							updatedAt: now,
						},
					})

				// Keep cache bounded to prevent potential unbounded growth
				if (lastSeenCache.size > 5000) {
					lastSeenCache.clear()
				}
				lastSeenCache.set(userId, nowTime)
			}
			catch (err) {
				botLogger.error({ err, userId }, 'Failed to track user in database')
			}
		}

		await handleMessage(channel, userName, message, raw)
	})

	await chat.connect()
	return 'started'
}

export interface UserRoleInfo {
	role: 'viewer' | 'moderator' | 'caster'
	isVip: boolean
	isSubscriber: boolean
}

export async function getTwitchUserRole(userId: string): Promise<UserRoleInfo> {
	const api = getApiClient()
	const streamerToken = await db.select().from(twitchTokens).where(eq(twitchTokens.accountType, 'streamer')).then(res => res[0])

	const info: UserRoleInfo = {
		role: 'viewer',
		isVip: false,
		isSubscriber: false,
	}

	if (!streamerToken || !streamerToken.userId)
		return info

	if (userId === streamerToken.userId) {
		info.role = 'caster'
		return info
	}

	try {
		const isMod = await api.moderation.checkUserMod(streamerToken.userId, userId)
		if (isMod)
			info.role = 'moderator'
	}
	catch {}

	try {
		const vips = await api.channels.getVips(streamerToken.userId as string)
		if (vips.data.some(v => v.id === userId))
			info.isVip = true
	}
	catch {}

	try {
		const sub = await api.subscriptions.checkUserSubscription(userId, streamerToken.userId as string)
		if (sub)
			info.isSubscriber = true
	}
	catch {}

	return info
}

export function isBotRunning() {
	return chatClientInstance?.isConnected ?? false
}
