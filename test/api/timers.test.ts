import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import deleteTimersHandler from '~~/server/api/timers/index.delete'
import getTimersHandler from '~~/server/api/timers/index.get'
import postTimersHandler from '~~/server/api/timers/index.post'
import putTimersHandler from '~~/server/api/timers/index.put'
import { botEventBus } from '~~/server/bot/core/events'
import { executeTimerCheck, getGlobalMessageCount, resetGlobalMessageCount } from '~~/server/bot/modules/timers'
import { db } from '~~/server/database'
import { timers, twitchTokens } from '~~/server/database/schema'
import { clearDatabase } from '../helpers'
import { mockGetStreamInfo, mockSay } from '../setup'

describe('Timers API and Engine', () => {
	beforeEach(async () => {
		await clearDatabase()
		await db.delete(timers)
		resetGlobalMessageCount()
		mockGetStreamInfo.mockReset()
		mockGetStreamInfo.mockResolvedValue({ isOnline: false })
	})

	describe('API Operations', () => {
		it('should create a timer successfully', async () => {
			const res = await postTimersHandler({
				body: {
					name: 'Test Timer',
					enabled: true,
					messages: [
						{ text: 'Hello Chat 1', enabled: true },
						{ text: 'Hello Chat 2', enabled: false },
					],
					intervalOnline: 10,
					intervalOffline: 20,
					minMessages: 5,
				},
			} as any)

			expect(res.success).toBe(true)
			expect(res.id).toBeDefined()

			const timer = await db.select().from(timers).where(eq(timers.id, res.id)).then(r => r[0])
			expect(timer).toBeDefined()
			expect(timer!.name).toBe('Test Timer')
			expect(timer!.messages).toHaveLength(2)
			expect(timer!.messages[0]!.text).toBe('Hello Chat 1')
			expect(timer!.messages[0]!.enabled).toBe(true)
			expect(timer!.messages[1]!.enabled).toBe(false)
			expect(timer!.intervalOnline).toBe(10)
			expect(timer!.intervalOffline).toBe(20)
			expect(timer!.minMessages).toBe(5)
		})

		it('should fail to create a timer with invalid inputs', async () => {
			await expect(async () => {
				await postTimersHandler({
					body: {
						name: '', // Empty name (invalid)
						intervalOnline: -5, // Negative (invalid)
					},
				} as any)
			}).rejects.toThrow()
		})

		it('should list timers paginated', async () => {
			// Seed two timers
			await db.insert(timers).values([
				{
					id: 't1',
					name: 'A Timer',
					enabled: true,
					messages: [{ text: 'Msg A', enabled: true }],
					intervalOnline: 5,
					intervalOffline: 10,
					minMessages: 0,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
				{
					id: 't2',
					name: 'B Timer',
					enabled: true,
					messages: [{ text: 'Msg B', enabled: true }],
					intervalOnline: 5,
					intervalOffline: 10,
					minMessages: 0,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			])

			// Get lists
			const res = await getTimersHandler({} as any) // uses default pagination params (page 1, limit 10, search empty)
			expect(res.data).toHaveLength(2)
			expect(res.meta.total).toBe(2)
			expect(res.data[0]!.name).toBe('A Timer')
			expect(res.data[1]!.name).toBe('B Timer')
		})

		it('should edit a timer successfully', async () => {
			await db.insert(timers).values({
				id: 't1',
				name: 'Original Timer',
				enabled: false,
				messages: [{ text: 'Msg A', enabled: true }],
				intervalOnline: 5,
				intervalOffline: 10,
				minMessages: 0,
				createdAt: new Date(),
				updatedAt: new Date(),
			})

			const res = await putTimersHandler({
				body: {
					id: 't1',
					name: 'Updated Timer',
					enabled: true,
					messages: [{ text: 'Msg A Updated', enabled: true }],
					intervalOnline: 15,
					intervalOffline: 30,
					minMessages: 2,
				},
			} as any)

			expect(res.success).toBe(true)

			const timer = await db.select().from(timers).where(eq(timers.id, 't1')).then(r => r[0])
			expect(timer!.name).toBe('Updated Timer')
			expect(timer!.enabled).toBe(true)
			expect(timer!.messages[0]!.text).toBe('Msg A Updated')
			expect(timer!.intervalOnline).toBe(15)
			expect(timer!.intervalOffline).toBe(30)
			expect(timer!.minMessages).toBe(2)
		})

		it('should delete a timer successfully', async () => {
			await db.insert(timers).values({
				id: 't1',
				name: 'Delete Me',
				enabled: true,
				messages: [{ text: 'Msg A', enabled: true }],
				intervalOnline: 5,
				intervalOffline: 10,
				minMessages: 0,
				createdAt: new Date(),
				updatedAt: new Date(),
			})

			const res = await deleteTimersHandler({
				body: { id: 't1' },
			} as any)

			expect(res.success).toBe(true)

			const timer = await db.select().from(timers).where(eq(timers.id, 't1')).then(r => r[0])
			expect(timer).toBeUndefined()
		})
	})

	describe('Timer Engine Execution', () => {
		it('should send the next active message and cycle index', async () => {
			// Seed streamer token so it resolves channel
			await db.insert(twitchTokens).values({
				accountType: 'streamer',
				accessToken: 'streamer-token',
				refreshToken: 'streamer-refresh',
				scope: '[]',
				obtainmentTimestamp: Date.now(),
				userId: 'streamer-id',
				userName: 'streamerchannel',
				displayName: 'StreamerChannel',
			})

			// Create timer that is due (lastTriggeredAt = past)
			await db.insert(timers).values({
				id: 't-engine-1',
				name: 'Engine Timer',
				enabled: true,
				messages: [
					{ text: 'Message 1', enabled: true },
					{ text: 'Message 2', enabled: false }, // disabled, should be skipped
					{ text: 'Message 3', enabled: true },
				],
				lastSentIndex: 0,
				intervalOnline: 5,
				intervalOffline: 10,
				minMessages: 0,
				lastTriggeredAt: new Date(Date.now() - 15 * 60 * 1000), // 15 mins ago, due for offline (10m)
				createdAt: new Date(),
				updatedAt: new Date(),
			})

			// 1. Run check offline.
			await executeTimerCheck()

			// Check that it sent 'Message 1'
			expect(mockSay).toHaveBeenCalledWith('streamerchannel', 'Message 1')

			// Check database state: lastSentIndex should be updated to 1
			let timer = await db.select().from(timers).where(eq(timers.id, 't-engine-1')).then(r => r[0])
			expect(timer!.lastSentIndex).toBe(1)
			expect(timer!.lastTriggeredAt).toBeDefined()

			// Reset mock
			mockSay.mockClear()

			// Update lastTriggeredAt back to the past to check next run
			await db.update(timers).set({ lastTriggeredAt: new Date(Date.now() - 15 * 60 * 1000) }).where(eq(timers.id, 't-engine-1'))

			// 2. Run check offline again.
			// It starts scanning at lastSentIndex = 1. Since Message 2 is disabled, it should select Message 3.
			await executeTimerCheck()

			// Check that it sent 'Message 3'
			expect(mockSay).toHaveBeenCalledWith('streamerchannel', 'Message 3')

			// Check database state: next index should be (2 + 1) % 3 = 0
			timer = await db.select().from(timers).where(eq(timers.id, 't-engine-1')).then(r => r[0])
			expect(timer!.lastSentIndex).toBe(0)
		})

		it('should skip triggering if interval has not elapsed', async () => {
			await db.insert(twitchTokens).values({
				accountType: 'streamer',
				accessToken: 'streamer-token',
				refreshToken: 'streamer-refresh',
				scope: '[]',
				obtainmentTimestamp: Date.now(),
				userId: 'streamer-id',
				userName: 'streamerchannel',
				displayName: 'StreamerChannel',
			})

			await db.insert(timers).values({
				id: 't-engine-2',
				name: 'Engine Timer Not Due',
				enabled: true,
				messages: [{ text: 'Should not send', enabled: true }],
				lastSentIndex: 0,
				intervalOnline: 5,
				intervalOffline: 10,
				minMessages: 0,
				lastTriggeredAt: new Date(Date.now() - 2 * 60 * 1000), // only 2 mins ago, not due for offline (10m)
				createdAt: new Date(),
				updatedAt: new Date(),
			})

			await executeTimerCheck()
			expect(mockSay).not.toHaveBeenCalled()
		})

		it('should respect minMessages threshold', async () => {
			await db.insert(twitchTokens).values({
				accountType: 'streamer',
				accessToken: 'streamer-token',
				refreshToken: 'streamer-refresh',
				scope: '[]',
				obtainmentTimestamp: Date.now(),
				userId: 'streamer-id',
				userName: 'streamerchannel',
				displayName: 'StreamerChannel',
			})

			await db.insert(timers).values({
				id: 't-engine-3',
				name: 'Engine Timer Threshold',
				enabled: true,
				messages: [{ text: 'Threshold Msg', enabled: true }],
				lastSentIndex: 0,
				intervalOnline: 5,
				intervalOffline: 10,
				minMessages: 5, // needs 5 messages
				lastTriggeredAt: new Date(Date.now() - 15 * 60 * 1000), // due
				createdAt: new Date(),
				updatedAt: new Date(),
			})

			// Run check with 0 chat messages sent
			await executeTimerCheck()
			expect(mockSay).not.toHaveBeenCalled()

			// Simulate 5 chat messages
			for (let i = 0; i < 5; i++) {
				botEventBus.emit('chat', { channel: '#streamerchannel', user: 'alice', message: 'hello', raw: {} as any })
			}

			expect(getGlobalMessageCount()).toBe(5)

			// Run check again
			await executeTimerCheck()
			expect(mockSay).toHaveBeenCalledWith('streamerchannel', 'Threshold Msg')
		})
	})
})
