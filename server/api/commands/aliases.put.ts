import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { registry } from '~~/server/bot/core/registry'
import { db } from '~~/server/database'
import { commandAliases, commands } from '~~/server/database/schema'

const saveAliasesSchema = z.object({
	commandId: z.string().min(1),
	aliases: z.array(
		z.object({
			trigger: z.string().min(1).regex(/^[\w-]+$/, 'Alias trigger must be alphanumeric'),
			subcommand: z.string().nullable().optional(),
			overrideArgs: z.array(z.string()).nullable().optional(),
		}),
	),
})

export default defineEventHandler(async (event) => {
	const body = await readBody(event)
	const parsed = saveAliasesSchema.safeParse(body)

	if (!parsed.success) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid command aliases data',
			data: parsed.error.format(),
		})
	}

	const { commandId, aliases } = parsed.data

	// 1. Verify target command exists
	const coreCmd = registry.getCommand(commandId)
	if (!coreCmd) {
		throw createError({
			statusCode: 404,
			statusMessage: `Command "${commandId}" not found in registry.`,
		})
	}

	const dbCmdTriggers = await db.select().from(commands).then(res => res.map(c => c.trigger ? c.trigger.toLowerCase() : '').filter(Boolean))
	const cleanAliases = aliases.map(a => ({
		trigger: a.trigger.toLowerCase(),
		subcommand: a.subcommand || null,
		overrideArgs: a.overrideArgs || null,
	}))

	// 2. Validate collisions against root command triggers & request duplicates
	const seenTriggers = new Set<string>()

	for (const alias of cleanAliases) {
		if (seenTriggers.has(alias.trigger)) {
			throw createError({
				statusCode: 400,
				statusMessage: `Duplicate alias trigger "!${alias.trigger}" specified.`,
			})
		}
		seenTriggers.add(alias.trigger)

		if (dbCmdTriggers.includes(alias.trigger)) {
			throw createError({
				statusCode: 409,
				statusMessage: `Alias "!${alias.trigger}" conflicts with an existing root command trigger.`,
			})
		}
	}

	// 3. Batch override the database records inside a transaction
	await db.transaction(async (tx) => {
		// Clear existing aliases for this command
		await tx.delete(commandAliases).where(eq(commandAliases.commandId, commandId))

		// Insert new aliases
		if (cleanAliases.length > 0) {
			await tx.insert(commandAliases).values(
				cleanAliases.map(a => ({
					commandId,
					trigger: a.trigger,
					subcommand: a.subcommand,
					overrideArgs: a.overrideArgs,
				})),
			)
		}
	})

	// 4. Reload registry dynamic maps in-memory
	await registry.syncWithDb()

	return { success: true }
})
