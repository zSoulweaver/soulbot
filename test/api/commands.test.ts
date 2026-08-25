import { and, eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import commandsAliasesHandler from '~~/server/api/commands/aliases.put'
import commandsIndexHandler from '~~/server/api/commands/index.get'
import commandsSaveHandler from '~~/server/api/commands/save.put'
import commandsTemplatesHandler from '~~/server/api/commands/templates.put'
import { registry } from '~~/server/bot'
import { db } from '~~/server/database'
import { commandAliases, commands, commandTemplates } from '~~/server/database/schema'
import { clearDatabase } from '../helpers'

describe('Commands Management API Routes in-process', () => {
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

	describe('GET /api/commands', () => {
		it('should return list of all registered command modules and their structures', async () => {
			const res = await commandsIndexHandler({} as any)
			expect(res).toBeDefined()
			expect(res.length).toBeGreaterThanOrEqual(2)

			// Find points command in the API response
			const pointsCmd = res.find((cmd: any) => cmd.id === 'points')
			expect(pointsCmd).toBeDefined()
			expect(pointsCmd!.trigger).toBe('points')
			expect(pointsCmd!.enabled).toBe(true)
			expect(pointsCmd!.allowWhisper).toBe(false)
			expect(pointsCmd!.whisperSilentResponse).toBe(false)
			expect(pointsCmd!.aliases).toBeInstanceOf(Array)
			expect(pointsCmd!.templates).toBeInstanceOf(Array)
		})

		it('should surface node-scoped alias slices on the root and each subcommand node', async () => {
			await db.insert(commandAliases).values([
				{ commandId: 'points', trigger: 'pts', subcommand: null },
				{ commandId: 'points', trigger: 'giftalias', subcommand: 'gift' },
			])

			const res = await commandsIndexHandler({} as any)
			const pointsCmd = res.find((cmd: any) => cmd.id === 'points')
			expect(pointsCmd).toBeDefined()

			// Root node only owns its own scope
			expect(pointsCmd!.aliases.map((a: any) => a.trigger)).toEqual(['pts'])

			// Subcommand nodes own their relative-path scope
			const giftNode = pointsCmd?.subcommands?.gift
			expect(giftNode).toBeDefined()
			expect(giftNode!.aliases.map((a: any) => a.trigger)).toEqual(['giftalias'])
			expect(giftNode!.aliases[0].subcommand).toBe('gift')
		})
	})

	describe('PUT /api/commands/save', () => {
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
					allowWhisper: true,
					whisperSilentResponse: true,
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
			expect(dbCmd?.allowWhisper).toBe(true)
			expect(dbCmd?.whisperSilentResponse).toBe(true)
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

	describe('PUT /api/commands/aliases', () => {
		it('should save root-scope command aliases in DB without touching subcommand scopes', async () => {
			// Seed an existing subcommand-scoped alias that must survive the root save
			await db.insert(commandAliases).values({
				commandId: 'points',
				trigger: 'gift',
				subcommand: 'gift',
			})

			const res = await commandsAliasesHandler({
				body: {
					commandId: 'points',
					subcommand: null,
					aliases: [
						{ trigger: 'balance' },
					],
				},
			} as any)

			expect(res.success).toBe(true)

			const dbAliases = await db.select().from(commandAliases).where(eq(commandAliases.commandId, 'points'))
			expect(dbAliases).toHaveLength(2)
			expect(dbAliases.some(a => a.trigger === 'balance' && a.subcommand === null)).toBe(true)
			expect(dbAliases.some(a => a.trigger === 'gift' && a.subcommand === 'gift')).toBe(true)
		})

		it('should save subcommand-scoped aliases without clobbering the root scope', async () => {
			await db.insert(commandAliases).values({
				commandId: 'points',
				trigger: 'balance',
				subcommand: null,
			})

			const res = await commandsAliasesHandler({
				body: {
					commandId: 'points',
					subcommand: 'add',
					aliases: [
						{ trigger: 'give', overrideArgs: ['50'] },
					],
				},
			} as any)

			expect(res.success).toBe(true)

			const dbAliases = await db.select().from(commandAliases).where(eq(commandAliases.commandId, 'points'))
			expect(dbAliases).toHaveLength(2)
			expect(dbAliases.some(a => a.trigger === 'balance' && a.subcommand === null)).toBe(true)
			expect(dbAliases.some(a => a.trigger === 'give' && a.subcommand === 'add' && a.overrideArgs?.includes('50'))).toBe(true)
		})

		it('should replace only its own scope on repeat saves', async () => {
			await commandsAliasesHandler({
				body: {
					commandId: 'points',
					subcommand: 'add',
					aliases: [{ trigger: 'stale' }],
				},
			} as any)

			await commandsAliasesHandler({
				body: {
					commandId: 'points',
					subcommand: 'add',
					aliases: [{ trigger: 'fresh' }],
				},
			} as any)

			const dbScope = await db.select().from(commandAliases).where(and(eq(commandAliases.commandId, 'points'), eq(commandAliases.subcommand, 'add')))
			expect(dbScope).toHaveLength(1)
			expect(dbScope[0]?.trigger).toBe('fresh')
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

	describe('PUT /api/commands/templates', () => {
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
