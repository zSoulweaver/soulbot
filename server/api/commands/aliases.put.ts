import { and, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { clearCommandsDirectoryCache } from '~~/server/api/commands/directory.get'
import { registry } from '~~/server/bot/core/registry'
import { db } from '~~/server/database'
import { commandAliases, commands } from '~~/server/database/schema'
import { requireUserRole } from '~~/server/utils/auth'

const saveAliasesSchema = z.object({
	commandId: z.string().min(1),
	// Node scope: relative dotted path from the root command (e.g. 'add', 'get.top') or null for the root node itself.
	// All aliases in a request belong to this single scope; disjoint scopes prevent root/subcommand saves from clobbering each other.
	subcommand: z.string().regex(/^[\w-]+(\.[\w-]+)*$/, 'Scope must be a relative dotted subcommand path').nullish().default(null),
	aliases: z.array(
		z.object({
			trigger: z.string().min(1).regex(/^[\w-]+$/, 'Alias trigger must be alphanumeric'),
			overrideArgs: z.array(z.string()).nullable().optional(),
		}),
	),
})

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')
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
	const scopeSubcommand = parsed.data.subcommand ?? null

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
		overrideArgs: alias.overrideArgs || null,
	}))

	// Validate collisions against root command triggers & request duplicates
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

	// Clear only aliases inside this request's scope so other nodes stay untouched
	await db.delete(commandAliases).where(
		scopeSubcommand === null
			? and(eq(commandAliases.commandId, commandId), isNull(commandAliases.subcommand))
			: and(eq(commandAliases.commandId, commandId), eq(commandAliases.subcommand, scopeSubcommand)),
	)

	// Insert new aliases bound to the scope
	if (cleanAliases.length > 0) {
		await db.insert(commandAliases).values(
			cleanAliases.map(alias => ({
				commandId,
				trigger: alias.trigger,
				subcommand: scopeSubcommand,
				overrideArgs: alias.overrideArgs,
			})),
		)
	}

	await registry.syncWithDb()
	await clearCommandsDirectoryCache()

	return { success: true }
})
