import { beforeEach, describe, expect, it } from 'vitest'
import statusHandler from '~~/server/api/bot/status.get'
import { db } from '~~/server/database'
import { twitchTokens } from '~~/server/database/schema'
import { getBotToken, getStreamerToken } from '~~/server/utils/twurple'
import { clearDatabase } from '../helpers'
import { mockApiClient } from '../setup'

describe('Bot Status API', () => {
	beforeEach(async () => {
		await clearDatabase()
		mockApiClient.moderation.checkUserMod.mockReset()
	})

	it('should return isBotModerator: false for unauthorized public users when onboarded', async () => {
		// Seed bot and streamer tokens so we are considered onboarded
		await db.insert(twitchTokens).values([
			{
				accountType: 'streamer',
				userId: 'streamer-123',
				userName: 'streamer',
				displayName: 'Streamer',
				accessToken: 'access',
				refreshToken: 'refresh',
				scope: '[]',
				obtainmentTimestamp: Date.now(),
			},
			{
				accountType: 'bot',
				userId: 'bot-456',
				userName: 'bot',
				displayName: 'Bot',
				accessToken: 'access',
				refreshToken: 'refresh',
				scope: '[]',
				obtainmentTimestamp: Date.now(),
			},
		])
		await getStreamerToken(true)
		await getBotToken(true)

		// Mock session to return a normal viewer
		const mockGetUserSession = getUserSession as any
		mockGetUserSession.mockResolvedValueOnce({ user: { id: 'random-viewer', role: 'viewer' } })

		const event = {
			context: {},
		} as any

		const res = await statusHandler(event)
		expect(res.isBotModerator).toBe(false)
	})

	it('should check Twitch API for moderator status and cache it', async () => {
		await db.insert(twitchTokens).values([
			{
				accountType: 'streamer',
				userId: 'streamer-123',
				userName: 'streamer',
				displayName: 'Streamer',
				accessToken: 'access',
				refreshToken: 'refresh',
				scope: '[]',
				obtainmentTimestamp: Date.now(),
			},
			{
				accountType: 'bot',
				userId: 'bot-456',
				userName: 'bot',
				displayName: 'Bot',
				accessToken: 'access',
				refreshToken: 'refresh',
				scope: '[]',
				obtainmentTimestamp: Date.now(),
			},
		])
		await getStreamerToken(true)
		await getBotToken(true)

		// 1. Mock Twitch API checkUserMod to return false
		mockApiClient.moderation.checkUserMod.mockResolvedValueOnce(false)

		const event = {
			context: {},
		} as any

		const res1 = await statusHandler(event)
		expect(res1.isBotModerator).toBe(false)
		expect(mockApiClient.moderation.checkUserMod).toHaveBeenCalledTimes(1)

		// 2. Next call should hit cache and NOT call Twitch API, even if the API now would return true
		mockApiClient.moderation.checkUserMod.mockResolvedValueOnce(true)
		const res2 = await statusHandler(event)
		expect(res2.isBotModerator).toBe(false) // Still false from cache
		expect(mockApiClient.moderation.checkUserMod).toHaveBeenCalledTimes(1) // No new call

		// 3. Forcing refresh should bypass cache and check API
		const eventWithForce = {
			context: {},
		} as any
		// Mock getQuery to return force: 'true'
		const mockGetQuery = getQuery as any
		mockGetQuery.mockReturnValueOnce({ force: 'true' })

		const res3 = await statusHandler(eventWithForce)
		expect(res3.isBotModerator).toBe(true)
		expect(mockApiClient.moderation.checkUserMod).toHaveBeenCalledTimes(2) // New call triggered
	})
})
