import type { ChatMessage } from '@twurple/chat'
import { eq } from 'drizzle-orm'
import { handleChatMessage } from '~~/server/bot'
import { cleanUsername } from '~~/server/bot/core/utils'
import { db } from '~~/server/database'
import { commandAliases, commands, commandTemplates, settings, spotifyBlacklist, spotifyPlaylistCache, spotifyQueue, spotifyTokens, twitchTokens, users } from '~~/server/database/schema'
import { refreshAppSettingsCache } from '~~/server/utils/settings'
import { clearSpotifyTokenCache } from '~~/server/utils/spotify'
import { clearTwitchTokenCache } from '~~/server/utils/twurple'
import { mockSay } from './setup'

/**
 * Creates a type-safe mock ChatMessage that satisfies Twurple requirements
 * and replicates the exactly fields used in our bot middlewares.
 */
export function createMockChatMessage(options: {
	userId: string
	username: string
	displayName: string
	isBroadcaster: boolean
	isMod: boolean
	isVip: boolean
	isSubscriber: boolean
}): ChatMessage {
	return {
		userInfo: {
			userId: options.userId,
			userName: options.username,
			displayName: options.displayName,
			isBroadcaster: options.isBroadcaster,
			isMod: options.isMod,
			isVip: options.isVip,
			isSubscriber: options.isSubscriber,
			color: '#FFFFFF',
			badges: new Map(),
			badgeInfo: new Map(),
			userType: '',
		},
		id: 'mock-msg-id',
		date: new Date(),
		channelId: 'mock-channel-id',
		bits: 0,
		isCheer: false,
		isRedemption: false,
		isFirst: false,
		isHighlight: false,
		isReturningChatter: false,
		tags: new Map(),
	} as unknown as ChatMessage
}

/**
 * Seeds or updates a test user in the sqlite_test.db
 */
export async function createTestUser(options: {
	id: string
	username: string
	displayName?: string
	role?: 'viewer' | 'moderator' | 'caster'
	isVip?: boolean
	isSubscriber?: boolean
	points?: number
}) {
	const now = new Date()
	const username = cleanUsername(options.username)
	const displayName = options.displayName || options.username
	const id = options.id

	await db.insert(users).values({
		id,
		username,
		displayName,
		role: options.role || 'viewer',
		isVip: options.isVip || false,
		isSubscriber: options.isSubscriber || false,
		points: options.points ?? 0,
		firstSeen: Date.now(),
		lastSeen: Date.now(),
		createdAt: now,
		updatedAt: now,
	}).onConflictDoUpdate({
		target: users.id,
		set: {
			username,
			displayName,
			role: options.role || 'viewer',
			isVip: options.isVip || false,
			isSubscriber: options.isSubscriber || false,
			points: options.points ?? 0,
			lastSeen: Date.now(),
			updatedAt: now,
		},
	})

	return {
		displayName,
		...options,
	}
}

/**
 * Simulates typing a message in Twitch chat. Runs the entire bot onion execution pipeline
 * and returns the bot's responses and the updated database user record.
 */
export async function simulateCommand(
	message: string,
	userOptions: {
		id?: string
		username?: string
		displayName?: string
		role?: 'viewer' | 'moderator' | 'caster'
		isVip?: boolean
		isSubscriber?: boolean
		points?: number
	} = {},
) {
	mockSay.mockClear()

	const userId = userOptions.id || '999999'
	const username = userOptions.username || 'testuser'
	const displayName = userOptions.displayName || (userOptions.username ? userOptions.username.charAt(0).toUpperCase() + userOptions.username.slice(1) : 'TestUser')
	const role = userOptions.role || 'viewer'
	const isVip = userOptions.isVip || false
	const isSubscriber = userOptions.isSubscriber || false
	const points = userOptions.points ?? 0

	// Ensure the user exists in the database
	await createTestUser({
		id: userId,
		username,
		displayName,
		role,
		isVip,
		isSubscriber,
		points,
	})

	// Construct mock Twurple ChatMessage
	const rawMsg = createMockChatMessage({
		userId,
		username,
		displayName,
		isBroadcaster: role === 'caster',
		isMod: role === 'moderator',
		isVip,
		isSubscriber,
	})

	// Run chat handler dispatcher
	await handleChatMessage({
		channel: '#streamerchannel',
		user: username,
		message,
		raw: rawMsg,
	})

	// Retrieve captured bot replies from the mockSay spy
	const replies = mockSay.mock.calls.map(call => call[1])

	// Fetch updated user from the database
	const dbUser = await db.select().from(users).where(eq(users.id, userId)).then(res => res[0])

	return {
		replies,
		user: dbUser,
	}
}

/**
 * Clean up database collections between tests to keep isolation high.
 */
export async function clearDatabase() {
	clearTwitchTokenCache()
	clearSpotifyTokenCache()
	await db.delete(users)
	await db.delete(commandAliases)
	await db.delete(commands)
	await db.delete(commandTemplates)
	await db.delete(twitchTokens)
	await db.delete(spotifyTokens)
	await db.delete(settings)
	await db.delete(spotifyQueue)
	await db.delete(spotifyPlaylistCache)
	await db.delete(spotifyBlacklist)
	await refreshAppSettingsCache()
}
