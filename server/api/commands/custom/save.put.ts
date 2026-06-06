import { and, eq, ne } from 'drizzle-orm'
import { z } from 'zod'
import { registry } from '~~/server/bot/core/registry'
import { db } from '~~/server/database'
import { commandAliases, commands, customCommands } from '~~/server/database/schema'
import { requireUserRole } from '~~/server/utils/auth'

const saveCustomCommandSchema = z.object({
	id: z.string().min(1),
	trigger: z.string().min(1).regex(/^[\w-]+$/, 'Trigger must be alphanumeric and cannot contain spaces or prefix characters'),
	response: z.string().min(1, 'Response template is required'),
	description: z.string().optional().nullable(),
	enabled: z.boolean(),
	cost: z.preprocess(value => (value === null || value === undefined || value === '' || Number.isNaN(Number(value)) ? 0 : Number(value)), z.number().int().nonnegative()),
	globalCooldown: z.preprocess(value => (value === null || value === undefined || value === '' || Number.isNaN(Number(value)) ? 0 : Number(value)), z.number().int().nonnegative()),
	userCooldown: z.preprocess(value => (value === null || value === undefined || value === '' || Number.isNaN(Number(value)) ? 0 : Number(value)), z.number().int().nonnegative()),
	permission: z.string().default('everyone'),
})

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')

	const body = await readBody(event)
	const parsed = saveCustomCommandSchema.safeParse(body)

	if (!parsed.success) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid command configuration data',
			data: parsed.error.format(),
		})
	}

	const { id, trigger, response, description, enabled, cost, globalCooldown, userCooldown, permission } = parsed.data
	const cleanTrigger = trigger.trim().toLowerCase().replace(/^!/, '')

	// Validate command exists
	const [existingCustomCmd] = await db.select().from(customCommands).where(eq(customCommands.id, id))
	if (!existingCustomCmd) {
		throw createError({
			statusCode: 404,
			statusMessage: 'Custom command not found.',
		})
	}

	// Prevent collision with another root core command trigger
	const collidingCore = await db
		.select()
		.from(commands)
		.where(and(eq(commands.trigger, cleanTrigger)))
		.then(results => results.find(cmd => !cmd.id.startsWith('custom:')))

	if (collidingCore) {
		throw createError({
			statusCode: 409,
			statusMessage: `Trigger "!${cleanTrigger}" is already in use by built-in command "${collidingCore.id}".`,
		})
	}

	// Prevent collision with any existing command alias
	const collidingAlias = await db
		.select()
		.from(commandAliases)
		.where(eq(commandAliases.trigger, cleanTrigger))
		.then(results => results[0])

	if (collidingAlias) {
		throw createError({
			statusCode: 409,
			statusMessage: `Trigger "!${cleanTrigger}" is already in use as an alias for command "${collidingAlias.commandId}".`,
		})
	}

	// Prevent collision with another custom command trigger (excluding itself)
	const collidingCustom = await db
		.select()
		.from(customCommands)
		.where(and(eq(customCommands.trigger, cleanTrigger), ne(customCommands.id, id)))
		.then(results => results[0])

	if (collidingCustom) {
		throw createError({
			statusCode: 409,
			statusMessage: `Trigger "!${cleanTrigger}" is already in use by another custom command.`,
		})
	}

	await db
		.update(customCommands)
		.set({
			trigger: cleanTrigger,
			response,
			description: description || null,
			enabled,
			cost,
			globalCooldown,
			userCooldown,
			permission,
			updatedAt: new Date(),
		})
		.where(eq(customCommands.id, id))

	await registry.syncWithDb()

	return { success: true }
})
