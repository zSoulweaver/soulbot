import { ApiClient } from '@twurple/api'
import { RefreshingAuthProvider } from '@twurple/auth'
import { ChatClient } from '@twurple/chat'
import { eq } from 'drizzle-orm'
import { db } from '../database'
import { twitchTokens } from '../database/schema'

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
		console.log(`[Twurple] Tokens refreshed for user ${userId}`)
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
		console.log(`[Twurple] Loaded tokens for ${token.accountType} (User ID: ${token.userId})`)
	}
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

	chat.onConnect(() => console.log('[Bot] Connected to Twitch Chat'))
	chat.onMessage((channel, user, message) => {
		console.log(`[Bot] ${channel} <${user}>: ${message}`)
		if (message === '!ping') {
			chat.say(channel, 'Pong!')
		}
	})

	await chat.connect()
	return 'started'
}
