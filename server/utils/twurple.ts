import process from 'node:process'
import { ApiClient } from '@twurple/api'
import { RefreshingAuthProvider } from '@twurple/auth'
import { ChatClient } from '@twurple/chat'
import { eq } from 'drizzle-orm'
import { handleChatMessage, initBot, registry, templateRegistry } from '../bot'
import { eventSubManager } from '../bot/core/eventsub'
import { db } from '../database'
import { twitchTokens } from '../database/schema'
import { botLogger } from './logger'

let authProviderInstance: RefreshingAuthProvider | null = null
let apiClientInstance: ApiClient | null = null
let chatClientInstance: ChatClient | null = null

let cachedStreamerToken: typeof twitchTokens.$inferSelect | null = null
let cachedBotToken: typeof twitchTokens.$inferSelect | null = null

export async function registerTokenInProvider(token: typeof twitchTokens.$inferSelect) {
	const provider = getAuthProvider()
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
}

export async function getStreamerToken(forceRefresh = false) {
	if (!cachedStreamerToken || forceRefresh) {
		cachedStreamerToken = await db
			.select()
			.from(twitchTokens)
			.where(eq(twitchTokens.accountType, 'streamer'))
			.then(res => res[0]) || null

		if (cachedStreamerToken && !process.env.VITEST) {
			await registerTokenInProvider(cachedStreamerToken)
		}
	}
	return cachedStreamerToken
}

export async function getBotToken(forceRefresh = false) {
	if (!cachedBotToken || forceRefresh) {
		cachedBotToken = await db
			.select()
			.from(twitchTokens)
			.where(eq(twitchTokens.accountType, 'bot'))
			.then(res => res[0]) || null

		if (cachedBotToken && !process.env.VITEST) {
			await registerTokenInProvider(cachedBotToken)
		}
	}
	return cachedBotToken
}

export async function getStreamerChannelName(forceRefresh = false): Promise<string | null> {
	const token = await getStreamerToken(forceRefresh)
	return token?.userName || null
}

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

		if (cachedStreamerToken && cachedStreamerToken.userId === userId) {
			cachedStreamerToken = {
				...cachedStreamerToken,
				accessToken: newTokenData.accessToken,
				refreshToken: newTokenData.refreshToken!,
				expiresIn: newTokenData.expiresIn,
				obtainmentTimestamp: newTokenData.obtainmentTimestamp,
				scope: JSON.stringify(newTokenData.scope),
			}
		}
		if (cachedBotToken && cachedBotToken.userId === userId) {
			cachedBotToken = {
				...cachedBotToken,
				accessToken: newTokenData.accessToken,
				refreshToken: newTokenData.refreshToken!,
				expiresIn: newTokenData.expiresIn,
				obtainmentTimestamp: newTokenData.obtainmentTimestamp,
				scope: JSON.stringify(newTokenData.scope),
			}
		}

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
			cachedBotToken = token
			await provider.addUserForToken(tokenData, ['chat'])
		}
		else {
			cachedStreamerToken = token
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

	const botToken = await getBotToken()
	const streamerToken = await getStreamerToken()

	if (!botToken || !streamerToken || !streamerToken.userName)
		return null

	chatClientInstance = new ChatClient({
		authProvider: getAuthProvider(),
		channels: [streamerToken.userName],
		authIntents: ['chat'],
		isAlwaysMod: true,
	})

	return chatClientInstance
}

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
		await handleChatMessage({ channel, user: userName, message, raw })
	})

	await chat.connect()

	// Start EventSub WebSocket manager using streamer credentials
	const streamerToken = await getStreamerToken()
	if (streamerToken && streamerToken.userId) {
		const api = getApiClient()
		eventSubManager.start(api, streamerToken.userId).catch((err) => {
			botLogger.error({ err }, 'Failed to start EventSub manager on startBot')
		})
	}

	return 'started'
}

export async function stopBot() {
	// Stop EventSub WebSocket connection
	eventSubManager.stop()

	if (chatClientInstance && chatClientInstance.isConnected) {
		chatClientInstance.quit()
		chatClientInstance = null
		botLogger.info('Bot stopped manually')
		return 'stopped'
	}
	return 'not_running'
}

export interface UserRoleInfo {
	role: 'viewer' | 'moderator' | 'caster'
	isVip: boolean
	isSubscriber: boolean
}

export async function getTwitchUserRole(userId: string): Promise<UserRoleInfo> {
	const api = getApiClient()
	const streamerToken = await getStreamerToken()

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
		await api.asUser(streamerToken.userId as string, async (ctx) => {
			try {
				const isMod = await ctx.moderation.checkUserMod(streamerToken.userId as string, userId)
				if (isMod)
					info.role = 'moderator'
			}
			catch (err) {
				botLogger.error(err, 'Failed to check moderator status')
			}

			try {
				const vips = await ctx.channels.getVips(streamerToken.userId as string)
				if (vips.data.some(v => v.id === userId))
					info.isVip = true
			}
			catch (err) {
				botLogger.error(err, 'Failed to check VIP status')
			}

			try {
				const sub = await ctx.subscriptions.getSubscriptionForUser(streamerToken.userId as string, userId)
				if (sub)
					info.isSubscriber = true
			}
			catch (err) {
				botLogger.error(err, 'Failed to check subscriber status')
			}
		})
	}
	catch (err) {
		botLogger.error(err, 'Failed to execute Twitch API calls under streamer context')
	}

	return info
}

export function isBotRunning() {
	return chatClientInstance?.isConnected ?? false
}

let cachedIsBotMod: boolean | null = null
let lastModCheckTime = 0
const MOD_CHECK_CACHE_MS = 5 * 60 * 1000 // 5 minutes

export async function getBotModeratorStatus(forceRefresh = false): Promise<boolean> {
	const botToken = await getBotToken()
	const streamerToken = await getStreamerToken()
	if (!botToken || !botToken.userId || !streamerToken || !streamerToken.userId) {
		return false
	}

	const now = Date.now()
	if (!forceRefresh && cachedIsBotMod !== null && (now - lastModCheckTime) < MOD_CHECK_CACHE_MS) {
		return cachedIsBotMod
	}

	try {
		const api = getApiClient()
		await api.asUser(streamerToken.userId, async (ctx) => {
			cachedIsBotMod = await ctx.moderation.checkUserMod(streamerToken.userId as string, botToken.userId as string)
		})
		lastModCheckTime = now
	}
	catch (err) {
		botLogger.error(err, 'Failed to check if bot is moderator')
		return cachedIsBotMod ?? true
	}

	return cachedIsBotMod ?? false
}

export function clearTwitchTokenCache() {
	cachedStreamerToken = null
	cachedBotToken = null
	cachedIsBotMod = null
	lastModCheckTime = 0
}
