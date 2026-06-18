import { beforeEach, describe, expect, it, vi } from 'vitest'
import chatSendHandler from '~~/server/api/admin/chat/send.post'

// Import API handlers directly
import eventsGetHandler from '~~/server/api/admin/events/index.get'
import streamStatusHandler from '~~/server/api/admin/stream/status.get'
import { db } from '~~/server/database'
import { eventsLog, twitchTokens } from '~~/server/database/schema'
import { clearDatabase } from '../helpers'
import { mockApiClient, mockSay } from '../setup'

describe('Dashboard API Routes', () => {
	beforeEach(async () => {
		await clearDatabase()
		await db.delete(eventsLog)

		// Seed a streamer token so API functions can resolve the user id/channel name
		await db.insert(twitchTokens).values({
			accountType: 'streamer',
			userId: 'streamer-123',
			userName: 'streamerchannel',
			displayName: 'StreamerChannel',
			accessToken: 'streamer-access',
			refreshToken: 'streamer-refresh',
			obtainmentTimestamp: Date.now(),
			scope: '[]',
		})
	})

	describe('GET /api/admin/events', () => {
		it('should return empty list when no events are logged', async () => {
			// Mock standard query parameters inside global getQuery helper
			const mockGetQuery = (globalThis as any).getQuery
			mockGetQuery.mockReturnValue({ page: '1', limit: '10' })

			const res = await eventsGetHandler({} as any)
			expect(res.data).toEqual([])
			expect(res.meta.total).toBe(0)
		})

		it('should retrieve logged events with correct pagination and filter by type', async () => {
			// Log multiple mock events
			await db.insert(eventsLog).values([
				{ type: 'follow', userName: 'alice', displayName: 'Alice', createdAt: new Date(Date.now() - 3000) },
				{ type: 'subscription', userName: 'bob', displayName: 'Bob', metadata: { tier: '1000' }, createdAt: new Date(Date.now() - 2000) },
				{ type: 'cheer', userName: 'charlie', displayName: 'Charlie', metadata: { bitsCount: 100 }, createdAt: new Date(Date.now() - 1000) },
			])

			const mockGetQuery = (globalThis as any).getQuery
			mockGetQuery.mockReturnValue({ page: '1', limit: '2' })

			const res = await eventsGetHandler({} as any)
			// Should return latest 2 events sorted descending by creation time
			expect(res.data!.length).toBe(2)
			expect(res.data![0]!.userName).toBe('charlie')
			expect(res.data![1]!.userName).toBe('bob')
			expect(res.meta.total).toBe(3)
			expect(res.meta.totalPages).toBe(2)

			// Test type filter: type=follow
			mockGetQuery.mockReturnValue({ page: '1', limit: '10', type: 'follow' })
			const followRes = await eventsGetHandler({} as any)
			expect(followRes.data!.length).toBe(1)
			expect(followRes.data![0]!.userName).toBe('alice')
			expect(followRes.meta.total).toBe(1)
		})

		it('should search events by username', async () => {
			await db.insert(eventsLog).values([
				{ type: 'follow', userName: 'alice', displayName: 'Alice' },
				{ type: 'follow', userName: 'bob', displayName: 'Bob' },
			])

			const mockGetQuery = (globalThis as any).getQuery
			mockGetQuery.mockReturnValue({ page: '1', limit: '10', search: 'BOB' })

			const res = await eventsGetHandler({} as any)
			expect(res.data!.length).toBe(1)
			expect(res.data![0]!.userName).toBe('bob')
		})
	})

	describe('POST /api/admin/chat/send', () => {
		it('should successfully call chatClient.say to broadcast message', async () => {
			const res = await chatSendHandler({
				body: { message: 'Hello stream!' },
			} as any)

			expect(res).toEqual({ success: true })
			expect(mockSay).toHaveBeenCalledWith('streamerchannel', 'Hello stream!')
		})

		it('should fail with validation error when message payload is invalid', async () => {
			try {
				await chatSendHandler({
					body: { message: '' },
				} as any)
				expect.fail('Validation should have blocked empty message')
			}
			catch (error: any) {
				expect(error.statusCode).toBe(400)
			}
		})
	})

	describe('GET /api/admin/stream/status', () => {
		it('should return live metrics when stream is online', async () => {
			// Mock Twurple API stream status calls
			;(mockApiClient as any).streams = {
				getStreamByUserId: vi.fn(async () => ({
					title: 'Speedrunning Stardew Valley',
					gameName: 'Stardew Valley',
					viewers: 450,
					startDate: new Date(Date.now() - 3600000), // 1 hour ago
					tags: ['Speedrun', 'Chill'],
				})),
			}

			const res = await streamStatusHandler({} as any)
			expect(res.isOnline).toBe(true)
			expect(res.title).toBe('Speedrunning Stardew Valley')
			expect(res.gameName).toBe('Stardew Valley')
			expect(res.viewers).toBe(450)
			expect(res.uptime).toBeGreaterThanOrEqual(3600000)
			expect(res.tags).toEqual(['Speedrun', 'Chill'])
		})

		it('should return default channel metadata when stream is offline', async () => {
			;(mockApiClient as any).streams = {
				getStreamByUserId: vi.fn(async () => null),
			}
			;(mockApiClient as any).channels = {
				getChannelInfoById: vi.fn(async () => ({
					title: 'Offline Stream Title',
					gameName: 'Just Chatting',
					tags: ['Offline'],
				})),
			}

			const res = await streamStatusHandler({} as any)
			expect(res.isOnline).toBe(false)
			expect(res.title).toBe('Offline Stream Title')
			expect(res.gameName).toBe('Just Chatting')
			expect(res.viewers).toBe(0)
			expect(res.uptime).toBe(0)
			expect(res.tags).toEqual(['Offline'])
		})
	})
})
