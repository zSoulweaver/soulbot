import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { registry } from '~~/server/bot'
import { eventSubManager } from '~~/server/bot/core/eventsub'
import { db } from '~~/server/database'
import { commands, gameDeathCounters, games, twitchTokens } from '~~/server/database/schema'
import { getStreamerToken } from '~~/server/utils/twurple'
import { clearDatabase } from '../helpers'
import { mockApiClient, mockSay } from '../setup'

describe('Whisper Commands Integration', () => {
	beforeEach(async () => {
		await clearDatabase()
		vi.clearAllMocks()

		// Seed a streamer token and a bot token
		await db.insert(twitchTokens).values([
			{
				accountType: 'streamer',
				userId: 'streamer-id-123',
				userName: 'streamerchannel',
				displayName: 'StreamerChannel',
				accessToken: 'access',
				refreshToken: 'refresh',
				scope: '[]',
				obtainmentTimestamp: Date.now(),
			},
			{
				accountType: 'bot',
				userId: 'bot-id-456',
				userName: 'soulbot',
				displayName: 'SoulBot',
				accessToken: 'access',
				refreshToken: 'refresh',
				scope: '[]',
				obtainmentTimestamp: Date.now(),
			},
		])

		await getStreamerToken(true)

		// Mock live stream with game "Elden Ring"
		;(mockApiClient as any).streams = {
			getStreamByUserId: vi.fn(async () => ({
				gameName: 'Elden Ring',
			})),
		}

		// Mock user role lookup for API client
		;(mockApiClient as any).asUser = vi.fn(async (_userId, fn) => {
			return fn({
				moderation: {
					checkUserMod: vi.fn(async (_broadcasterId, userId) => userId === 'mod-user-id'),
				},
				channels: {
					getVips: vi.fn(async () => ({ data: [] })),
				},
				subscriptions: {
					getSubscriptionForUser: vi.fn(async () => null),
				},
			})
		})

		// Seed initial commands into database and memory
		await registry.syncWithDb()
	})

	it('should ignore whispered command when allowWhisper is false (default)', async () => {
		// Simulate whisper from streamer !deaths add
		await eventSubManager.simulate('user.whisper.message', {
			id: 'w-1',
			userId: 'bot-id',
			userName: 'botuser',
			userDisplayName: 'BotUser',
			senderUserId: 'streamer-id-123',
			senderUserName: 'streamerchannel',
			senderUserDisplayName: 'StreamerChannel',
			messageText: '!deaths add',
		} as any)

		// Death count should not exist/change
		const game = await db.query.games.findFirst({
			where: eq(games.name, 'Elden Ring'),
		})
		expect(game).toBeUndefined()
		expect(mockSay).not.toHaveBeenCalled()
	})

	it('should execute command and send response to chat when allowWhisper is true and whisperSilentResponse is false', async () => {
		// Update deaths command to allow whispers
		await db.update(commands).set({
			allowWhisper: true,
			whisperSilentResponse: false,
		}).where(eq(commands.id, 'deaths'))

		await registry.syncWithDb()

		// Simulate whisper from streamer !deaths add
		await eventSubManager.simulate('user.whisper.message', {
			id: 'w-2',
			userId: 'bot-id',
			userName: 'botuser',
			userDisplayName: 'BotUser',
			senderUserId: 'streamer-id-123',
			senderUserName: 'streamerchannel',
			senderUserDisplayName: 'StreamerChannel',
			messageText: '!deaths add',
		} as any)

		// Deaths record should be updated
		const game = await db.query.games.findFirst({
			where: eq(games.name, 'Elden Ring'),
		})
		expect(game).toBeDefined()
		const counter = await db.query.gameDeathCounters.findFirst({
			where: eq(gameDeathCounters.gameId, game!.id),
		})
		expect(counter?.deaths).toBe(1)

		// Response should have been broadcast to the streamer's chat
		expect(mockSay).toHaveBeenCalledWith(
			'streamerchannel',
			'@StreamerChannel, Added 1 death(s)! Total deaths for Elden Ring: 1.',
		)
	})

	it('should execute command silently without chat response when whisperSilentResponse is true', async () => {
		// Update deaths command to allow whispers with silent response
		await db.update(commands).set({
			allowWhisper: true,
			whisperSilentResponse: true,
		}).where(eq(commands.id, 'deaths'))

		await registry.syncWithDb()

		// Simulate whisper from streamer !deaths add 3
		await eventSubManager.simulate('user.whisper.message', {
			id: 'w-3',
			userId: 'bot-id',
			userName: 'botuser',
			userDisplayName: 'BotUser',
			senderUserId: 'streamer-id-123',
			senderUserName: 'streamerchannel',
			senderUserDisplayName: 'StreamerChannel',
			messageText: '!deaths add 3',
		} as any)

		// Deaths record should be updated in database
		const game = await db.query.games.findFirst({
			where: eq(games.name, 'Elden Ring'),
		})
		expect(game).toBeDefined()
		const counter = await db.query.gameDeathCounters.findFirst({
			where: eq(gameDeathCounters.gameId, game!.id),
		})
		expect(counter?.deaths).toBe(3)

		// Chat output should be suppressed (mockSay not called)
		expect(mockSay).not.toHaveBeenCalled()
	})

	it('should enforce role permissions on whispered commands for viewers', async () => {
		// Update deaths command to allow whispers
		await db.update(commands).set({
			allowWhisper: true,
			whisperSilentResponse: false,
		}).where(eq(commands.id, 'deaths'))

		await registry.syncWithDb()

		// Simulate whisper from regular viewer (not mod, not streamer)
		await eventSubManager.simulate('user.whisper.message', {
			id: 'w-4',
			userId: 'bot-id',
			userName: 'botuser',
			userDisplayName: 'BotUser',
			senderUserId: 'viewer-id-999',
			senderUserName: 'randomviewer',
			senderUserDisplayName: 'RandomViewer',
			messageText: '!deaths add',
		} as any)

		// Action should have been rejected due to permissions (moderator required)
		const game = await db.query.games.findFirst({
			where: eq(games.name, 'Elden Ring'),
		})
		expect(game).toBeUndefined()
		expect(mockSay).not.toHaveBeenCalled()
	})

	it('should allow whispered execution if only the subcommand has allowWhisper enabled', async () => {
		// Root 'deaths' has allowWhisper: false, but 'deaths.add' has allowWhisper: true
		await db.update(commands).set({
			allowWhisper: false,
			whisperSilentResponse: false,
		}).where(eq(commands.id, 'deaths'))

		await db.update(commands).set({
			allowWhisper: true,
			whisperSilentResponse: false,
		}).where(eq(commands.id, 'deaths.add'))

		await registry.syncWithDb()

		// Simulate whisper from streamer !deaths add
		await eventSubManager.simulate('user.whisper.message', {
			id: 'w-5',
			userId: 'bot-id',
			userName: 'botuser',
			userDisplayName: 'BotUser',
			senderUserId: 'streamer-id-123',
			senderUserName: 'streamerchannel',
			senderUserDisplayName: 'StreamerChannel',
			messageText: '!deaths add',
		} as any)

		// Deaths record should be updated
		const game = await db.query.games.findFirst({
			where: eq(games.name, 'Elden Ring'),
		})
		expect(game).toBeDefined()
		const counter = await db.query.gameDeathCounters.findFirst({
			where: eq(gameDeathCounters.gameId, game!.id),
		})
		expect(counter?.deaths).toBe(1)
		expect(mockSay).toHaveBeenCalledWith(
			'streamerchannel',
			'@StreamerChannel, Added 1 death(s)! Total deaths for Elden Ring: 1.',
		)
	})
})
