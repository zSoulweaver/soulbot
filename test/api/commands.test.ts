import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import commandsAliasesHandler from '~~/server/api/commands/aliases.put'
import commandsIndexHandler from '~~/server/api/commands/index.get'
import commandsSaveHandler from '~~/server/api/commands/save.put'
import commandsTemplatesHandler from '~~/server/api/commands/templates.put'

import { registry } from '~~/server/bot'
import { db } from '~~/server/database'
import { commandAliases, commands, commandTemplates } from '~~/server/database/schema'
import { clearDatabase } from '../helpers'

describe('commands Management API Routes in-process', () => {
	beforeEach(async () => {
		await clearDatabase()

		// Always ensure 'points' is registered in database config for these tests
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
			id: 'commands',
			trigger: 'commands',
			enabled: true,
			cost: 0,
			globalCooldown: 0,
			userCooldown: 0,
			cooldown: 0,
			permission: null,
		})

		await registry.syncWithDb()
	})

	describe('gET /api/commands', () => {
		it('should return list of all registered command modules and their structures', async () => {
			const res = await commandsIndexHandler({} as any)
			expect(res).toBeDefined()
			expect(res.length).toBeGreaterThanOrEqual(2)

			// Find points command in the API response
			const pointsCmd = res.find(cmd => cmd.id === 'points')
			expect(pointsCmd).toBeDefined()
			expect(pointsCmd.trigger).toBe('points')
			expect(pointsCmd.enabled).toBe(true)
			expect(pointsCmd.aliases).toBeInstanceOf(Array)
			expect(pointsCmd.templates).toBeInstanceOf(Array)
		})
	})

	describe('pUT /api/commands/save', () => {
		it('should update command config settings successfully in DB', async () => {
			const res = await commandsSaveHandler({
				body: {
					id: 'points',
					trigger: 'pts',
					enabled: true,
					cost: 20,
					globalCooldown: 60,
					userCooldown: 10,
					permission: 'moderator',
				},
			} as any)

			expect(res.success).toBe(true)

			// Check database update
			const dbCmd = await db.select().from(commands).where(eq(commands.id, 'points')).then(res => res[0])
			expect(dbCmd?.trigger).toBe('pts')
			expect(dbCmd?.cost).toBe(20)
			expect(dbCmd?.globalCooldown).toBe(60)
			expect(dbCmd?.userCooldown).toBe(10)
			expect(dbCmd?.permission).toBe('moderator')
		})

		it('should fail with 409 Conflict if trigger conflicts with another root command', async () => {
			// Update the commands module to have the trigger 'cmd'
			await db.update(commands)
				.set({ trigger: 'cmd' })
				.where(eq(commands.id, 'commands'))

			await registry.syncWithDb()

			try {
				await commandsSaveHandler({
					body: {
						id: 'points',
						trigger: 'cmd', // Conflicting trigger!
						enabled: true,
						cost: 0,
						globalCooldown: 0,
						userCooldown: 0,
					},
				} as any)
				expect.fail('Should have thrown conflict')
			}
			catch (err: any) {
				expect(err.statusCode).toBe(409)
				expect(err.statusMessage).toContain('already in use by root command')
			}
		})
	})

	describe('pUT /api/commands/aliases', () => {
		it('should save command aliases successfully in DB', async () => {
			const res = await commandsAliasesHandler({
				body: {
					commandId: 'points',
					aliases: [
						{ trigger: 'balance' },
						{ trigger: 'top', subcommand: 'get.top' },
					],
				},
			} as any)

			expect(res.success).toBe(true)

			// Check database update
			const dbAliases = await db.select().from(commandAliases).where(eq(commandAliases.commandId, 'points'))
			expect(dbAliases).toHaveLength(2)
			expect(dbAliases.some(a => a.trigger === 'balance' && a.subcommand === null)).toBe(true)
			expect(dbAliases.some(a => a.trigger === 'top' && a.subcommand === 'get.top')).toBe(true)
		})

		it('should fail with 400 Bad Request if duplicate triggers exist in input', async () => {
			try {
				await commandsAliasesHandler({
					body: {
						commandId: 'points',
						aliases: [
							{ trigger: 'dup' },
							{ trigger: 'dup' },
						],
					},
				} as any)
				expect.fail('Should have thrown duplicate error')
			}
			catch (err: any) {
				expect(err.statusCode).toBe(400)
				expect(err.statusMessage).toContain('Duplicate alias trigger')
			}
		})

		it('should fail with 409 Conflict if alias conflicts with active root command trigger', async () => {
			try {
				await commandsAliasesHandler({
					body: {
						commandId: 'points',
						aliases: [
							{ trigger: 'commands' }, // 'commands' is a root trigger!
						],
					},
				} as any)
				expect.fail('Should have thrown conflict error')
			}
			catch (err: any) {
				expect(err.statusCode).toBe(409)
				expect(err.statusMessage).toContain('conflicts with an existing root command trigger')
			}
		})
	})

	describe('pUT /api/commands/templates', () => {
		it('should save template overrides successfully in DB', async () => {
			const res = await commandsTemplatesHandler({
				body: {
					templates: [
						{ id: 'points.show', template: 'Test template show ${amount} for ${target}' },
					],
				},
			} as any)

			expect(res.success).toBe(true)

			// Check database update
			const dbTpl = await db.select().from(commandTemplates).where(eq(commandTemplates.id, 'points.show')).then(res => res[0])
			expect(dbTpl?.template).toBe('Test template show ${amount} for ${target}')
		})

		it('should fail with 404 Not Found if template ID is not in registry', async () => {
			try {
				await commandsTemplatesHandler({
					body: {
						templates: [
							{ id: 'invalid.template.id', template: 'Hello' },
						],
					},
				} as any)
				expect.fail('Should have thrown not found error')
			}
			catch (err: any) {
				expect(err.statusCode).toBe(404)
				expect(err.statusMessage).toContain('is not defined by any command module')
			}
		})
	})
})
