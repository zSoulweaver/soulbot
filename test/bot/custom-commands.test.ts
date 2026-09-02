import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { registry } from '~~/server/bot'
import { db } from '~~/server/database'
import { counters, customCommands, twitchTokens, users } from '~~/server/database/schema'
import { getStreamerToken } from '~~/server/utils/twurple'
import { clearDatabase, simulateCommand } from '../helpers'
import { mockApiClient, mockGetStreamInfo } from '../setup'

describe('Bot Dynamic Custom Commands & Variable Templates Integration', () => {
	beforeEach(async () => {
		await clearDatabase()
		await registry.syncWithDb()
	})

	describe('Basic Variable Resolving', () => {
		it('should resolve sender, user.name, user.id, and channel context', async () => {
			await db.insert(customCommands).values({
				id: 'c1',
				trigger: 'hello',
				response: 'Hello $(sender)! Welcome to $(channel). Your ID is $(sender.id) and username is $(sender.name).',
				enabled: true,
				cost: 0,
				globalCooldown: 0,
				userCooldown: 0,
				permission: 'everyone',
				createdAt: new Date(),
				updatedAt: new Date(),
			})

			await registry.syncWithDb()

			const { replies } = await simulateCommand('!hello', {
				id: '998877',
				username: 'bob_the_streamer',
				displayName: 'BobTheStreamer',
			})

			expect(replies).toHaveLength(1)
			expect(replies[0]).toBe('Hello BobTheStreamer! Welcome to streamerchannel. Your ID is 998877 and username is bob_the_streamer.')
		})

		it('should parse positional arguments $(1) and query $(query) variables', async () => {
			await db.insert(customCommands).values({
				id: 'c2',
				trigger: 'testargs',
				response: 'First: $(1) | Second: $(2) | Query: $(query)',
				enabled: true,
				cost: 0,
				globalCooldown: 0,
				userCooldown: 0,
				permission: 'everyone',
				createdAt: new Date(),
				updatedAt: new Date(),
			})

			await registry.syncWithDb()

			const { replies } = await simulateCommand('!testargs Peach Mario Bowser', {
				id: '1',
				username: 'alice',
				displayName: 'Alice',
			})

			expect(replies).toHaveLength(1)
			expect(replies[0]).toBe('First: Peach | Second: Mario | Query: Peach Mario Bowser')
		})

		it('should resolve $(touser) with target or fallback to sender display name', async () => {
			await db.insert(customCommands).values({
				id: 'c3',
				trigger: 'hug',
				response: '$(sender) hugs $(touser)!',
				enabled: true,
				cost: 0,
				globalCooldown: 0,
				userCooldown: 0,
				permission: 'everyone',
				createdAt: new Date(),
				updatedAt: new Date(),
			})

			await registry.syncWithDb()

			// Case A: Command invoked with a target user (e.g. !hug @luigi)
			const resA = await simulateCommand('!hug @luigi', {
				id: '1',
				username: 'mario',
				displayName: 'Mario',
			})
			expect(resA.replies).toHaveLength(1)
			expect(resA.replies[0]).toBe('Mario hugs luigi!')

			// Case B: Command invoked alone -> fallbacks to sender
			const resB = await simulateCommand('!hug', {
				id: '1',
				username: 'mario',
				displayName: 'Mario',
			})
			expect(resB.replies).toHaveLength(1)
			expect(resB.replies[0]).toBe('Mario hugs Mario!')
		})
	})

	describe('Dynamic Database-Backed Counters', () => {
		it('should increment command-specific, named, and modified counters', async () => {
			await db.insert(customCommands).values({
				id: 'c4',
				trigger: 'deaths',
				response: 'Death count is now $(count)! Wins: $(count wins) | Fails: $(count fails +5)',
				enabled: true,
				cost: 0,
				globalCooldown: 0,
				userCooldown: 0,
				permission: 'everyone',
				createdAt: new Date(),
				updatedAt: new Date(),
			})

			await registry.syncWithDb()

			// First execution
			const res1 = await simulateCommand('!deaths', { id: '1', username: 'alice', displayName: 'Alice' })
			expect(res1.replies[0]).toBe('Death count is now 1! Wins: 1 | Fails: 5')

			// Second execution: increments default and named counters
			const res2 = await simulateCommand('!deaths', { id: '1', username: 'alice', displayName: 'Alice' })
			expect(res2.replies[0]).toBe('Death count is now 2! Wins: 2 | Fails: 10')

			// Verify data persisted in tables
			const deathCounter = await db.select().from(counters).where(eq(counters.name, 'deaths')).then(res => res[0])
			expect(deathCounter?.value).toBe(2)
			const winCounter = await db.select().from(counters).where(eq(counters.name, 'wins')).then(res => res[0])
			expect(winCounter?.value).toBe(2)
			const failCounter = await db.select().from(counters).where(eq(counters.name, 'fails')).then(res => res[0])
			expect(failCounter?.value).toBe(10)
		})

		it('should support resetting a counter via reset modifier', async () => {
			await db.insert(customCommands).values({
				id: 'c5',
				trigger: 'clearfails',
				response: 'Fails reset: $(count bossfails reset)',
				enabled: true,
				cost: 0,
				globalCooldown: 0,
				userCooldown: 0,
				permission: 'everyone',
				createdAt: new Date(),
				updatedAt: new Date(),
			})

			// Preseed database counter value
			await db.insert(counters).values({ name: 'bossfails', value: 15 })

			await registry.syncWithDb()

			const { replies } = await simulateCommand('!clearfails', { id: '1', username: 'alice', displayName: 'Alice' })
			expect(replies[0]).toBe('Fails reset: 0')

			const bossfails = await db.select().from(counters).where(eq(counters.name, 'bossfails')).then(res => res[0])
			expect(bossfails?.value).toBe(0)
		})
	})

	describe('Deepest-First Evaluation Order', () => {
		it('should evaluate positional arguments before modifying named counters', async () => {
			await db.insert(customCommands).values({
				id: 'c6',
				trigger: 'score',
				response: 'Added score to $(1)! Total score: $(count $(1) +10)',
				enabled: true,
				cost: 0,
				globalCooldown: 0,
				userCooldown: 0,
				permission: 'everyone',
				createdAt: new Date(),
				updatedAt: new Date(),
			})

			await registry.syncWithDb()

			// Call !score bob -> should resolve $(1) to bob, and then evaluate $(count bob +10)
			const { replies } = await simulateCommand('!score bob', { id: '1', username: 'alice', displayName: 'Alice' })
			expect(replies[0]).toBe('Added score to bob! Total score: 10')

			const bobScore = await db.select().from(counters).where(eq(counters.name, 'bob')).then(res => res[0])
			expect(bobScore?.value).toBe(10)
		})
	})

	describe('Point Balance, Currency and Unified $(var) Schema', () => {
		it('should fetch user points, currency formatting, and map $(var) schemas', async () => {
			await db.insert(customCommands).values({
				id: 'c7',
				trigger: 'balance',
				response: 'You have $(points) dynamic: $(core.currency) | singular: $(core.currency_singular)',
				enabled: true,
				cost: 0,
				globalCooldown: 0,
				userCooldown: 0,
				permission: 'everyone',
				createdAt: new Date(),
				updatedAt: new Date(),
			})

			await registry.syncWithDb()

			const { replies } = await simulateCommand('!balance', {
				id: '987',
				username: 'charlie',
				displayName: 'Charlie',
				points: 75,
			})

			expect(replies).toHaveLength(1)
			expect(replies[0]).toBe('You have 75 dynamic: points | singular: point')
		})
	})

	describe('Registry Pipeline Middleware Execution', () => {
		it('should reject execution under insufficient permissions', async () => {
			await db.insert(customCommands).values({
				id: 'c8',
				trigger: 'secret',
				response: 'Caster only response.',
				enabled: true,
				cost: 0,
				globalCooldown: 0,
				userCooldown: 0,
				permission: 'broadcaster',
				createdAt: new Date(),
				updatedAt: new Date(),
			})

			await registry.syncWithDb()

			// Trigger as viewer -> should silently drop (no replies)
			const viewerRes = await simulateCommand('!secret', { id: '2', username: 'viewer', role: 'viewer' })
			expect(viewerRes.replies).toHaveLength(0)

			// Trigger as broadcaster -> succeeds
			const broadcasterRes = await simulateCommand('!secret', { id: '3', username: 'streamer', displayName: 'Streamer', role: 'caster' })
			expect(broadcasterRes.replies).toHaveLength(1)
			expect(broadcasterRes.replies[0]).toBe('Caster only response.')
		})

		it('should validate and deduct point costs on successful command run', async () => {
			await db.insert(customCommands).values({
				id: 'c9',
				trigger: 'buy',
				response: 'Purchased dynamic custom command.',
				enabled: true,
				cost: 15,
				globalCooldown: 0,
				userCooldown: 0,
				permission: 'everyone',
				createdAt: new Date(),
				updatedAt: new Date(),
			})

			await registry.syncWithDb()

			// Case A: Insufficient points
			const resA = await simulateCommand('!buy', { id: '4', username: 'poor', displayName: 'PoorUser', points: 5 })
			expect(resA.replies).toHaveLength(1)
			expect(resA.replies[0]).toBe('@PoorUser, You need 15 points to use this command.')

			// Case B: Sufficient points -> successfully deducts
			const resB = await simulateCommand('!buy', { id: '5', username: 'rich', displayName: 'RichUser', points: 20 })
			expect(resB.replies).toHaveLength(1)
			expect(resB.replies[0]).toBe('Purchased dynamic custom command.')

			// Verify DB deductions
			const richUser = await db.select().from(users).where(eq(users.id, '5')).then(res => res[0])
			expect(richUser?.points).toBe(5)
		})

		it('should enforce command global cooldown blocks', async () => {
			await db.insert(customCommands).values({
				id: 'c10',
				trigger: 'limited',
				response: 'Running.',
				enabled: true,
				cost: 0,
				globalCooldown: 10,
				userCooldown: 0,
				permission: 'everyone',
				createdAt: new Date(),
				updatedAt: new Date(),
			})

			await registry.syncWithDb()

			// Call 1 -> succeeds
			const res1 = await simulateCommand('!limited', { id: '1', username: 'alice', displayName: 'Alice' })
			expect(res1.replies).toHaveLength(1)
			expect(res1.replies[0]).toBe('Running.')

			// Call 2 immediately after -> blocked for regular viewer
			const res2 = await simulateCommand('!limited', { id: '1', username: 'alice', displayName: 'Alice' })
			expect(res2.replies).toHaveLength(1)
			expect(res2.replies[0]).toContain('This command is on global cooldown. Please wait 10s.')
		})

		it('should allow moderators and above to bypass global and user cooldowns', async () => {
			await db.insert(customCommands).values({
				id: 'c11',
				trigger: 'modcooldown',
				response: 'Mod executed.',
				enabled: true,
				cost: 0,
				globalCooldown: 60,
				userCooldown: 60,
				permission: 'everyone',
				createdAt: new Date(),
				updatedAt: new Date(),
			})

			await registry.syncWithDb()

			// Moderator call 1 -> succeeds
			const res1 = await simulateCommand('!modcooldown', { id: '2', username: 'moduser', displayName: 'ModUser', role: 'moderator' })
			expect(res1.replies).toHaveLength(1)
			expect(res1.replies[0]).toBe('Mod executed.')

			// Moderator call 2 immediately after -> also succeeds (bypasses cooldown)
			const res2 = await simulateCommand('!modcooldown', { id: '2', username: 'moduser', displayName: 'ModUser', role: 'moderator' })
			expect(res2.replies).toHaveLength(1)
			expect(res2.replies[0]).toBe('Mod executed.')
		})
	})

	describe('New Custom Variables & Phantombot syntax', () => {
		beforeEach(async () => {
			vi.restoreAllMocks()

			// Seed streamer token for Twitch API variables
			await db.insert(twitchTokens).values({
				accountType: 'streamer',
				userId: 'streamer-id-123',
				userName: 'streamerchannel',
				displayName: 'StreamerChannel',
				accessToken: 'access',
				refreshToken: 'refresh',
				scope: '[]',
				obtainmentTimestamp: Date.now(),
			})
			await getStreamerToken(true)
		})

		it('should resolve $(randint) and custom range $(randint start end)', async () => {
			await db.insert(customCommands).values({
				id: 'randint-test',
				trigger: 'random',
				response: 'Default: $(randint) | Custom: $(randint 10 20)',
				enabled: true,
				cost: 0,
				globalCooldown: 0,
				userCooldown: 0,
				permission: 'everyone',
				createdAt: new Date(),
				updatedAt: new Date(),
			})
			await registry.syncWithDb()

			const { replies } = await simulateCommand('!random', { id: '1', username: 'alice', displayName: 'Alice' })
			expect(replies).toHaveLength(1)

			// Extract values to verify they are numbers within range
			const parts = replies[0]!.split(' | ')
			const defaultVal = Number(parts[0]!.replace('Default: ', ''))
			const customVal = Number(parts[1]!.replace('Custom: ', ''))

			expect(defaultVal).toBeGreaterThanOrEqual(1)
			expect(defaultVal).toBeLessThanOrEqual(100)
			expect(customVal).toBeGreaterThanOrEqual(10)
			expect(customVal).toBeLessThanOrEqual(20)
		})

		it('should resolve $(uptime) when live and offline', async () => {
			await db.insert(customCommands).values({
				id: 'uptime-test',
				trigger: 'up',
				response: 'Stream uptime: $(uptime)',
				enabled: true,
				cost: 0,
				globalCooldown: 0,
				userCooldown: 0,
				permission: 'everyone',
				createdAt: new Date(),
				updatedAt: new Date(),
			})
			await registry.syncWithDb()

			// Case A: Online
			mockGetStreamInfo.mockResolvedValueOnce({
				isOnline: true,
				uptime: 7300, // 2 hours, 1 minute, 40 seconds
			})
			const resA = await simulateCommand('!up', { id: '1', username: 'alice', displayName: 'Alice' })
			expect(resA.replies).toHaveLength(1)
			expect(resA.replies[0]).toBe('Stream uptime: 2 hours, 1 minute, 40 seconds')

			// Case B: Offline
			mockGetStreamInfo.mockResolvedValueOnce({
				isOnline: false,
			})
			const resB = await simulateCommand('!up', { id: '1', username: 'alice', displayName: 'Alice' })
			expect(resB.replies).toHaveLength(1)
			expect(resB.replies[0]).toBe('Stream uptime: offline')
		})

		it('should resolve $(followage) when user is following and when they are not', async () => {
			await db.insert(customCommands).values({
				id: 'followage-test',
				trigger: 'follow',
				response: '$(sender) $(followage) | checking other: $(followage bob)',
				enabled: true,
				cost: 0,
				globalCooldown: 0,
				userCooldown: 0,
				permission: 'everyone',
				createdAt: new Date(),
				updatedAt: new Date(),
			})
			await registry.syncWithDb()

			// Setup follow records: alice follows 5 days ago, bob is not following
			const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 - 10 * 1000)
			mockApiClient.channels.getChannelFollowers.mockImplementation(async (_broadcasterId, userId) => {
				if (userId === 'mock-alice-id') {
					return {
						data: [
							{
								userId: 'mock-alice-id',
								userName: 'alice',
								userDisplayName: 'Alice',
								followDate: fiveDaysAgo,
							},
						],
						total: 1,
					}
				}
				// bob is not following
				return { data: [], total: 0 }
			})

			const { replies } = await simulateCommand('!follow', { id: '12345', username: 'alice', displayName: 'Alice' })
			expect(replies).toHaveLength(1)
			expect(replies[0]).toBe('Alice has been following for 5 days, 10 seconds | checking other: is not following this channel')
		})

		it('should pre-process Phantombot syntax: (#), (followage), (uptime)', async () => {
			await db.insert(customCommands).values({
				id: 'phantombot-test',
				trigger: 'pb',
				response: 'turned (#) years old, (followage), stream has been online for (uptime)',
				enabled: true,
				cost: 0,
				globalCooldown: 0,
				userCooldown: 0,
				permission: 'everyone',
				createdAt: new Date(),
				updatedAt: new Date(),
			})
			await registry.syncWithDb()

			// Setup mocks
			mockGetStreamInfo.mockResolvedValueOnce({
				isOnline: true,
				uptime: 3600, // 1 hour
			})
			const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
			mockApiClient.channels.getChannelFollowers.mockResolvedValueOnce({
				data: [
					{
						userId: 'mock-alice-id',
						userName: 'alice',
						userDisplayName: 'Alice',
						followDate: fiveDaysAgo,
					},
				],
				total: 1,
			})

			const { replies } = await simulateCommand('!pb', { id: '12345', username: 'alice', displayName: 'Alice' })
			expect(replies).toHaveLength(1)

			// Verify it replaced (#) with a random number, (followage) with follow status, and (uptime) with uptime
			expect(replies[0]).toContain('has been following for 5 days')
			expect(replies[0]).toContain('stream has been online for 1 hour')
			expect(replies[0]).toMatch(/turned \d+ years old/)
		})
	})

	describe('Multi-Line Output Support', () => {
		it('should send multi-line responses as separate chat messages, filtering empty lines', async () => {
			await db.insert(customCommands).values({
				id: 'multiline-test',
				trigger: 'rules',
				response: 'Rule 1: Be nice!\n\nRule 2: Have fun, $(sender)!\r\n\r\n   \nRule 3: Enjoy the stream.',
				enabled: true,
				cost: 0,
				globalCooldown: 0,
				userCooldown: 0,
				permission: 'everyone',
				createdAt: new Date(),
				updatedAt: new Date(),
			})
			await registry.syncWithDb()

			const { replies } = await simulateCommand('!rules', { id: '1', username: 'alice', displayName: 'Alice' })
			expect(replies).toHaveLength(3)
			expect(replies[0]).toBe('Rule 1: Be nice!')
			expect(replies[1]).toBe('Rule 2: Have fun, Alice!')
			expect(replies[2]).toBe('Rule 3: Enjoy the stream.')
		})
	})
})
