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
	
	chat.onMessage(async (channel, user, message, raw) => {
		// Track user in DB
		await db.insert(users)
			.values({
				id: raw.userInfo.userId,
				username: raw.userInfo.userName,
				displayName: raw.userInfo.displayName,
				points: 0,
				firstSeen: Date.now(),
				lastSeen: Date.now(),
			})
			.onConflictDoUpdate({
				target: users.id,
				set: {
					username: raw.userInfo.userName,
					displayName: raw.userInfo.displayName,
					lastSeen: Date.now(),
				},
			})

		await handleMessage(channel, user, message, raw)
	})

	await chat.connect()
	return 'started'
}
