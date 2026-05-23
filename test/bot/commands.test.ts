import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '~~/server/database'
import { commandAliases, commands, users } from '~~/server/database/schema'
import { eq } from 'drizzle-orm'
import { registry } from '~~/server/bot'
import { clearDatabase, createTestUser, simulateCommand } from '../helpers'

describe('Bot Dynamic Command Management & Aliases Integration', () => {
	beforeEach(async () => {
		await clearDatabase()

		// Re-initialize a default points configuration row in the commands table,
		// as is standard in production when points module starts.
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

		await db.insert(commands).values({
			id: 'points.get.top',
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

	describe('Dynamic Trigger Renaming & Disabling', () => {
		it('should dynamically rename command trigger from !points to !pts', async () => {
			// Update the trigger of the points root command in database
			await db.update(commands)
				.set({ trigger: 'pts' })
				.where(eq(commands.id, 'points'))

			// Sync in-memory registry
			await registry.syncWithDb()

			// 1. Simulate old command '!points' -> Should ignore because trigger points is no longer mapped
			const oldResult = await simulateCommand('!points', {
				id: '12345',
				username: 'alice',
				points: 50,
			})
			expect(oldResult.replies).toHaveLength(0)

			// 2. Simulate new command '!pts' -> Should successfully execute
			const newResult = await simulateCommand('!pts', {
				id: '12345',
				username: 'alice',
				points: 50,
			})
			expect(newResult.replies).toHaveLength(1)
			expect(newResult.replies[0]).toBe('@Alice, you have have 50 points.')
		})

		it('should dynamically silence the bot if a command is disabled in DB', async () => {
			// Disable points root command
			await db.update(commands)
				.set({ enabled: false })
				.where(eq(commands.id, 'points'))

			await registry.syncWithDb()

			const { replies } = await simulateCommand('!points', {
				id: '12345',
				username: 'alice',
				points: 100,
			})

			// Disabling dynamic check silences replies completely
			expect(replies).toHaveLength(0)
		})
	})

	describe('Dynamic Command Aliases', () => {
		// Scenario 1: Alias a root command and ensure root/subcommands respond
		it('Scenario 1: should support aliasing a root command (!balance -> !points)', async () => {
			// Insert alias: trigger 'balance' -> root command 'points'
			await db.insert(commandAliases).values({
				trigger: 'balance',
				commandId: 'points',
				subcommand: null,
				overrideArgs: null,
			})

			await registry.syncWithDb()

			// A. Test that the root command behaves perfectly via alias
			const rootRes = await simulateCommand('!balance', {
				id: '12345',
				username: 'alice',
				points: 75,
			})
			expect(rootRes.replies).toHaveLength(1)
			expect(rootRes.replies[0]).toBe('@Alice, you have have 75 points.')

			// B. Test that nested subcommands resolve correctly through the root alias
			await createTestUser({ id: '2', username: 'u2', displayName: 'User2', points: 90 })
			const subRes = await simulateCommand('!balance get top 1', {
				id: '12345',
				username: 'alice',
			})
			expect(subRes.replies).toHaveLength(1)
			expect(subRes.replies[0]).toBe('@Alice, Top 1 Leaders: #1 User2 (90 pts)')
		})

		// Scenario 2: Alias a subcommand and verify arguments pass through
		it('Scenario 2: should support direct subcommand aliasing (!top -> !points get top)', async () => {
			// Insert alias: trigger 'top' -> subcommand 'get.top' on 'points' command
			await db.insert(commandAliases).values({
				trigger: 'top',
				commandId: 'points',
				subcommand: 'get.top',
				overrideArgs: null,
			})

			await registry.syncWithDb()

			// Seed database
			await createTestUser({ id: '2', username: 'u2', displayName: 'User2', points: 99 })
			await createTestUser({ id: '3', username: 'u3', displayName: 'User3', points: 40 })

			// Call !top 1 -> check that the argument 1 is forwarded properly to points.get.top handler
			const { replies } = await simulateCommand('!top 1', {
				id: '12345',
				username: 'alice',
			})

			expect(replies).toHaveLength(1)
			expect(replies[0]).toBe('@Alice, Top 1 Leaders: #1 User2 (99 pts)')
		})

		// Scenario 3: Alias a subcommand with overriden arguments
		it('Scenario 3: should support subcommand aliasing with override args (!addpoints <amount> -> !points add soui <amount>)', async () => {
			// Insert alias: trigger 'addpoints' -> subcommand 'add' on 'points' command, with overrideArgs: ['soui']
			await db.insert(commandAliases).values({
				trigger: 'addpoints',
				commandId: 'points',
				subcommand: 'add',
				overrideArgs: ['soui'],
			})

			await registry.syncWithDb()

			// Seed target user 'soui' in DB
			await createTestUser({
				id: '8888',
				username: 'soui',
				displayName: 'Soui',
				points: 100,
			})

			// Call !addpoints 50 as moderator -> check that argument '50' is successfully passed
			// alongside the overriden argument 'soui', resulting in 50 points added to 'soui'
			const { replies } = await simulateCommand('!addpoints 50', {
				id: '12345',
				username: 'alice',
				role: 'moderator',
			})

			expect(replies).toHaveLength(1)
			expect(replies[0]).toBe('@Alice, Added 50 points to Soui. They now have 150 points.')

			// Verify soui's database value got directly modified
			const souiRecord = await db.select().from(users).where(eq(users.id, '8888')).then(res => res[0])
			expect(souiRecord?.points).toBe(150)
		})
	})
})
