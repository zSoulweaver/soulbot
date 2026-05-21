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
	const coreCommand = registry.getCommand(commandId)
	if (!coreCommand) {
		throw createError({
			statusCode: 404,
			statusMessage: `Command "${commandId}" not found in registry.`,
		})
	}

	const databaseCommandTriggers = await db
		.select()
		.from(commands)
		.then(results => results.map(cmd => cmd.trigger ? cmd.trigger.toLowerCase() : '').filter(Boolean))

	const cleanAliases = aliases.map(alias => ({
		trigger: alias.trigger.toLowerCase(),
		subcommand: alias.subcommand || null,
		overrideArgs: alias.overrideArgs || null,
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

		if (databaseCommandTriggers.includes(alias.trigger)) {
			throw createError({
				statusCode: 409,
				statusMessage: `Alias "!${alias.trigger}" conflicts with an existing root command trigger.`,
			})
		}
	}

	// 3. Batch override the database records
	// Clear existing aliases for this command
	await db.delete(commandAliases).where(eq(commandAliases.commandId, commandId))

	// Insert new aliases
	if (cleanAliases.length > 0) {
		await db.insert(commandAliases).values(
			cleanAliases.map(alias => ({
				commandId,
				trigger: alias.trigger,
				subcommand: alias.subcommand,
				overrideArgs: alias.overrideArgs,
			})),
		)
	}

	// 4. Reload registry dynamic maps in-memory
	await registry.syncWithDb()

	return { success: true }
})
