import { beforeEach, describe, expect, it, vi } from 'vitest'
import directoryHandler from '~~/server/api/commands/directory.get'
import { registry } from '~~/server/bot'
import { db } from '~~/server/database'
import { commandAliases, commands, customCommands } from '~~/server/database/schema'
import { clearDatabase } from '../helpers'

describe('Public Commands Directory API Route (/api/commands/directory)', () => {
	beforeEach(async () => {
		await clearDatabase()

		// Setup core commands
		await db.insert(commands).values({
			id: 'points',
			trigger: 'points',
			enabled: true,
			cost: 0,
			globalCooldown: 0,
			userCooldown: 0,
			cooldown: 0,
			permission: 'everyone',
			hidden: false,
		})

		await db.insert(commands).values({
			id: 'points.add',
			trigger: null,
			enabled: true,
			cost: 0,
			globalCooldown: 0,
			userCooldown: 0,
			cooldown: 0,
			permission: 'moderator',
			hidden: false,
		})

		await db.insert(commands).values({
			id: 'points.gift',
			trigger: null,
			enabled: true,
			cost: 0,
			globalCooldown: 0,
			userCooldown: 0,
			cooldown: 0,
			permission: 'everyone',
			hidden: false,
		})

		await db.insert(commands).values({
			id: 'command',
			trigger: 'command',
			enabled: true,
			cost: 0,
			globalCooldown: 0,
			userCooldown: 0,
			cooldown: 0,
			permission: 'broadcaster',
			hidden: true, // Hidden from public directory
		})

		// Setup custom commands
		await db.insert(customCommands).values({
			id: 'cc_public',
			trigger: 'discord',
			response: 'Join our discord!',
			description: 'Discord server link',
			enabled: true,
			cost: 0,
			globalCooldown: 0,
			userCooldown: 0,
			permission: 'everyone',
			hidden: false,
			createdAt: new Date(),
			updatedAt: new Date(),
		})

		await db.insert(customCommands).values({
			id: 'cc_hidden',
			trigger: 'secret',
			response: 'Secret command!',
			description: 'Secret',
			enabled: true,
			cost: 0,
			globalCooldown: 0,
			userCooldown: 0,
			permission: 'everyone',
			hidden: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		})

		await db.insert(customCommands).values({
			id: 'cc_disabled',
			trigger: 'disabledcmd',
			response: 'Disabled command',
			description: 'Disabled',
			enabled: false,
			cost: 0,
			globalCooldown: 0,
			userCooldown: 0,
			permission: 'everyone',
			hidden: false,
			createdAt: new Date(),
			updatedAt: new Date(),
		})

		await db.insert(customCommands).values({
			id: 'cc_mod',
			trigger: 'modonly',
			response: 'Mod only command',
			description: 'Mod only',
			enabled: true,
			cost: 0,
			globalCooldown: 0,
			userCooldown: 0,
			permission: 'moderator',
			hidden: false,
			createdAt: new Date(),
			updatedAt: new Date(),
		})

		// Setup aliases: root alias '!pts' -> '!points', and subcommand alias '!gift' -> '!points gift'
		await db.insert(commandAliases).values({
			commandId: 'points',
			trigger: 'pts',
			subcommand: null,
		})

		await db.insert(commandAliases).values({
			commandId: 'points',
			trigger: 'gift',
			subcommand: 'gift',
		})

		await registry.syncWithDb()
	})

	it('should return only public, enabled, non-hidden commands for unauthenticated viewers', async () => {
		// Mock unauthenticated session
		vi.mocked(getUserSession).mockResolvedValueOnce(null as any)

		const res = await directoryHandler({} as any)
		expect(res).toBeDefined()

		const triggers = res.map((c: any) => c.activeTrigger)

		// Public custom command should be present
		expect(triggers).toContain('discord')

		// Public core command should be present
		expect(triggers).toContain('points')

		// Hidden commands should NOT be present
		expect(triggers).not.toContain('command')
		expect(triggers).not.toContain('secret')

		// Disabled commands should NOT be present
		expect(triggers).not.toContain('disabledcmd')

		// Mod-only custom commands should NOT be present
		expect(triggers).not.toContain('modonly')

		// Subcommands check for points: points.gift should be visible, points.add should be omitted
		const pointsCmd = res.find((c: any) => c.id === 'points')
		expect(pointsCmd).toBeDefined()

		// Root aliases should only include root aliases ('pts'), not subcommand aliases ('gift')
		expect(pointsCmd.aliases.map((a: any) => a.trigger)).toContain('pts')
		expect(pointsCmd.aliases.map((a: any) => a.trigger)).not.toContain('gift')

		if (pointsCmd.subcommands) {
			expect(pointsCmd.subcommands.gift).toBeDefined()
			expect(pointsCmd.subcommands.add).toBeUndefined()

			// Subcommand 'gift' should have its alias 'gift'
			expect(pointsCmd.subcommands.gift.aliases.map((a: any) => a.trigger)).toContain('gift')
		}
	})

	it('should return all enabled commands including hidden and privileged commands for moderators', async () => {
		// Mock moderator session
		vi.mocked(getUserSession).mockResolvedValueOnce({
			user: { id: 'mod-1', username: 'moduser', role: 'moderator' },
		} as any)

		const res = await directoryHandler({} as any)
		expect(res).toBeDefined()

		const triggers = res.map((c: any) => c.activeTrigger)

		// Public commands
		expect(triggers).toContain('discord')
		expect(triggers).toContain('points')

		// Hidden commands should be present for moderators
		expect(triggers).toContain('command')
		expect(triggers).toContain('secret')

		const secretCmd = res.find((c: any) => c.activeTrigger === 'secret')
		expect(secretCmd?.hidden).toBe(true)

		const hiddenCoreCmd = res.find((c: any) => c.activeTrigger === 'command')
		expect(hiddenCoreCmd?.hidden).toBe(true)

		// Mod-only custom command should be present
		expect(triggers).toContain('modonly')
		const modCmd = res.find((c: any) => c.activeTrigger === 'modonly')
		expect(modCmd?.permission).toBe('moderator')

		// Disabled command should STILL be omitted
		expect(triggers).not.toContain('disabledcmd')

		// Subcommands for points: both gift and add should be visible for moderators
		const pointsCmd = res.find((c: any) => c.id === 'points')
		expect(pointsCmd).toBeDefined()
		if (pointsCmd.subcommands) {
			expect(pointsCmd.subcommands.gift).toBeDefined()
			expect(pointsCmd.subcommands.add).toBeDefined()
		}
	})
})
