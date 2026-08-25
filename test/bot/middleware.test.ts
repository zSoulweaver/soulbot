import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { registry } from '~~/server/bot'
import { db } from '~~/server/database'
import { commands, users } from '~~/server/database/schema'
import { clearDatabase, createTestUser, simulateCommand } from '../helpers'

describe('Bot Middleware Core Execution Pipeline', () => {
	beforeEach(async () => {
		await clearDatabase()

		// Re-initialize default points configurations
		await db.insert(commands).values({
			id: 'points',
			trigger: 'points',
			enabled: true,
			cost: 0,
			globalCooldown: 0,
			userCooldown: 0,
			cooldown: 0,
			permission: null,
		})

		await db.insert(commands).values({
			id: 'points.add',
			trigger: null,
			enabled: true,
			cost: 0,
			globalCooldown: 0,
			userCooldown: 0,
			cooldown: 0,
			permission: null,
		})

		await registry.syncWithDb()
	})

	describe('Command & Subcommand Disablement', () => {
		it('should silently drop when root command is disabled', async () => {
			await db.update(commands)
				.set({ enabled: false })
				.where(eq(commands.id, 'points'))
			await registry.syncWithDb()

			const { replies } = await simulateCommand('!points', {
				id: '12345',
				username: 'alice',
			})
			expect(replies).toHaveLength(0)
		})

		it('should silently drop when subcommand is disabled', async () => {
			await db.update(commands)
				.set({ enabled: false })
				.where(eq(commands.id, 'points.add'))
			await registry.syncWithDb()

			const { replies } = await simulateCommand('!points add bob 50', {
				id: '12345',
				username: 'alice',
				role: 'moderator',
			})
			expect(replies).toHaveLength(0)
		})
	})

	describe('Points Cost Validation & Deduction', () => {
		it('should reject execution if user has insufficient points', async () => {
			// Update points command to cost 50 points
			await db.update(commands)
				.set({ cost: 50 })
				.where(eq(commands.id, 'points'))
			await registry.syncWithDb()

			const { replies } = await simulateCommand('!points', {
				id: '12345',
				username: 'alice',
				points: 30,
			})

			expect(replies).toHaveLength(1)
			expect(replies[0]).toBe('@Alice, You need 50 points to use this command.')

			// Verify points were not deducted
			const user = await db.select().from(users).where(eq(users.id, '12345')).then(res => res[0])
			expect(user?.points).toBe(30)
		})

		it('should deduct points on successful execution', async () => {
			// Update points command to cost 40 points
			await db.update(commands)
				.set({ cost: 40 })
				.where(eq(commands.id, 'points'))
			await registry.syncWithDb()

			const { replies } = await simulateCommand('!points', {
				id: '12345',
				username: 'alice',
				points: 100,
			})

			expect(replies).toHaveLength(1)
			// Alice starts with 100, is fetched during handlePointsRoot (before points-cost middleware runs deduction)
			expect(replies[0]).toBe('@Alice, you have 100 points. Rank #1')

			// Verify points were deducted post-execution
			const user = await db.select().from(users).where(eq(users.id, '12345')).then(res => res[0])
			expect(user?.points).toBe(60)
		})
	})

	describe('Cooldown Limits (User & Global)', () => {
		beforeEach(() => {
			vi.useFakeTimers()
		})

		afterEach(() => {
			vi.useRealTimers()
		})

		it('should enforce user-specific cooldown', async () => {
			await db.update(commands)
				.set({ userCooldown: 10 }) // 10s cooldown
				.where(eq(commands.id, 'points'))
			await registry.syncWithDb()

			// Create user
			await createTestUser({ id: '12345', username: 'alice', displayName: 'Alice', points: 100 })

			// First execution
			const res1 = await simulateCommand('!points', { id: '12345', username: 'alice' })
			expect(res1.replies).toHaveLength(1)

			// Second execution immediately
			const res2 = await simulateCommand('!points', { id: '12345', username: 'alice' })
			expect(res2.replies).toHaveLength(1)
			expect(res2.replies[0]).toBe('@Alice, You are using this command too fast. Please wait 10s.')

			// Advance time by 11 seconds
			vi.advanceTimersByTime(11000)

			// Third execution after cooldown
			const res3 = await simulateCommand('!points', { id: '12345', username: 'alice' })
			expect(res3.replies).toHaveLength(1)
			expect(res3.replies[0]).not.toContain('too fast')
		})

		it('should enforce global cooldown', async () => {
			await db.update(commands)
				.set({ globalCooldown: 15 }) // 15s cooldown
				.where(eq(commands.id, 'points'))
			await registry.syncWithDb()

			// First execution (Alice)
			const res1 = await simulateCommand('!points', { id: '12345', username: 'alice' })
			expect(res1.replies).toHaveLength(1)

			// Second execution immediately (Bob)
			const res2 = await simulateCommand('!points', { id: '67890', username: 'bob', displayName: 'Bob' })
			expect(res2.replies).toHaveLength(1)
			expect(res2.replies[0]).toBe('@Bob, This command is on global cooldown. Please wait 15s.')

			// Advance time by 16 seconds
			vi.advanceTimersByTime(16000)

			// Third execution (Bob)
			const res3 = await simulateCommand('!points', { id: '67890', username: 'bob', displayName: 'Bob' })
			expect(res3.replies).toHaveLength(1)
			expect(res3.replies[0]).not.toContain('global cooldown')
		})
	})

	describe('Arguments Parsing & Validation', () => {
		it('should return Zod validation errors and command usage', async () => {
			const { replies } = await simulateCommand('!points add', {
				id: '12345',
				username: 'alice',
				role: 'moderator',
			})
			expect(replies).toHaveLength(1)
			expect(replies[0]).toBe('@Alice, Incorrect usage, missing user. | Usage: `!points add <user> <amount>`')
		})

		it('should validate parameter types (e.g. number for amount)', async () => {
			const { replies } = await simulateCommand('!points add bob abc', {
				id: '12345',
				username: 'alice',
				role: 'moderator',
			})
			expect(replies).toHaveLength(1)
			expect(replies[0]).toBe('@Alice, Incorrect usage, amount must be a number. | Usage: `!points add <user> <amount>`')
		})

		it('should strip invisible characters and extra whitespace without causing validation errors', async () => {
			const { replies } = await simulateCommand('!points  add  \u034F@bob\u200B  50  \u2800 ', {
				id: '12345',
				username: 'alice',
				role: 'moderator',
			})
			expect(replies).toHaveLength(1)
			expect(replies[0]).toBe('@Alice, Added 50 points to Bob. They now have 50 points.')
		})
	})
})
