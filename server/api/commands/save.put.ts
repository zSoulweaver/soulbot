import { and, eq, ne } from 'drizzle-orm'
import { z } from 'zod'
import { registry } from '~~/server/bot/core/registry'
import { db } from '~~/server/database'
import { commandAliases, commands } from '~~/server/database/schema'

const saveCommandSchema = z.object({
	id: z.string().min(1),
	trigger: z.string().min(1).regex(/^[\w-]+$/, 'Trigger must be alphanumeric and cannot contain spaces or prefix characters').optional().nullable(),
	enabled: z.boolean(),
	cost: z.number().int().nonnegative(),
	globalCooldown: z.number().int().nonnegative(),
	userCooldown: z.number().int().nonnegative(),
	permission: z.string().optional().nullable(),
})

export default defineEventHandler(async (event) => {
	const body = await readBody(event)
	const parsed = saveCommandSchema.safeParse(body)

	if (!parsed.success) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid command configuration data',
			data: parsed.error.format(),
		})
	}

	const { id, trigger, enabled, cost, globalCooldown, userCooldown, permission } = parsed.data
	const cleanTrigger = trigger ? trigger.toLowerCase() : null

	const isSubCommand = id.includes('.')

	if (cleanTrigger) {
		if (!isSubCommand) {
			// 1. Prevent collision with another root command's trigger
			const collisionCmd = await db
				.select()
				.from(commands)
				.where(and(eq(commands.trigger, cleanTrigger), ne(commands.id, id)))
				.then(res => res[0])

			if (collisionCmd && !collisionCmd.id.includes('.')) {
				throw createError({
					statusCode: 409,
					statusMessage: `Trigger "!${cleanTrigger}" is already in use by root command "${collisionCmd.id}".`,
				})
			}

			// 2. Prevent collision with any existing command alias
			const collisionAlias = await db
				.select()
				.from(commandAliases)
				.where(eq(commandAliases.trigger, cleanTrigger))
				.then(res => res[0])

			if (collisionAlias) {
				throw createError({
					statusCode: 409,
					statusMessage: `Trigger "!${cleanTrigger}" is already in use as an alias for command "${collisionAlias.commandId}".`,
				})
			}
		}
		else {
			// Subcommand collision check:
			// Extract parent prefix, e.g. "points" from "points.add" or "points.get" from "points.get.top"
			const parentPrefix = id.substring(0, id.lastIndexOf('.'))
			const parentParts = parentPrefix.split('.')

			// A. Prevent collision with sibling subcommands defined in code (default keys)
			const firstPart = parentParts[0]
			let currentScope: any = firstPart ? registry.getCommand(firstPart) : undefined
			for (let i = 1; i < parentParts.length; i++) {
				const part = parentParts[i]
				if (part) {
					currentScope = currentScope?.subcommands?.[part]
				}
			}

			if (currentScope?.subcommands) {
				for (const [siblingKey] of Object.entries(currentScope.subcommands)) {
					const ownKey = id.substring(id.lastIndexOf('.') + 1)
					if (cleanTrigger === siblingKey && siblingKey !== ownKey) {
						throw createError({
							statusCode: 409,
							statusMessage: `Trigger word "${cleanTrigger}" collides with built-in subcommand "${siblingKey}".`,
						})
					}
				}
			}

			// B. Prevent collision with other custom triggers of siblings in database
			const siblingCmds = await db
				.select()
				.from(commands)
				.where(ne(commands.id, id))
				.then(res => res.filter(c => c.id.startsWith(`${parentPrefix}.`) && c.id.substring(parentPrefix.length + 1).split('.').length === 1))

			const collisionSibling = siblingCmds.find(c => c.trigger === cleanTrigger)
			if (collisionSibling) {
				throw createError({
					statusCode: 409,
					statusMessage: `Trigger word "${cleanTrigger}" is already in use by sibling subcommand "${collisionSibling.id}".`,
				})
			}
		}
	}

	// 3. Update command config in database
	const existing = await db.select().from(commands).where(eq(commands.id, id)).then(res => res[0])

	if (existing) {
		await db
			.update(commands)
			.set({
				trigger: cleanTrigger,
				enabled,
				cost,
				globalCooldown,
				userCooldown,
				permission,
			})
			.where(eq(commands.id, id))
	}
	else {
		await db.insert(commands).values({
			id,
			trigger: cleanTrigger,
			enabled,
			cost,
			globalCooldown,
			userCooldown,
			cooldown: 0,
			permission,
		})
	}

	// 4. Trigger in-memory re-sync of the live Twitch chat client triggers
	await registry.syncWithDb()

	return { success: true }
})
