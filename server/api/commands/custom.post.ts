import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { clearCommandsDirectoryCache } from '~~/server/api/commands/directory.get'
import { registry } from '~~/server/bot/core/registry'
import { db } from '~~/server/database'
import { commandAliases, commands, customCommands } from '~~/server/database/schema'
import { requireUserRole } from '~~/server/utils/auth'

const createCustomCommandSchema = z.object({
	trigger: z.string().min(1).regex(/^[\w-]+$/, 'Trigger must be alphanumeric and cannot contain spaces or prefix characters'),
	response: z.string().min(1, 'Response template is required'),
	description: z.string().optional().nullable(),
	cost: z.preprocess(value => (value === null || value === undefined || value === '' || Number.isNaN(Number(value)) ? 0 : Number(value)), z.number().int().nonnegative()),
	globalCooldown: z.preprocess(value => (value === null || value === undefined || value === '' || Number.isNaN(Number(value)) ? 0 : Number(value)), z.number().int().nonnegative()),
	userCooldown: z.preprocess(value => (value === null || value === undefined || value === '' || Number.isNaN(Number(value)) ? 0 : Number(value)), z.number().int().nonnegative()),
	permission: z.string().default('everyone'),
	hidden: z.boolean().default(false),
})

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')

	const body = await readBody(event)
	const parsed = createCustomCommandSchema.safeParse(body)

	if (!parsed.success) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid command configuration data',
			data: parsed.error.format(),
		})
	}

	const { trigger, response, description, cost, globalCooldown, userCooldown, permission, hidden } = parsed.data
	const cleanTrigger = trigger.trim().toLowerCase().replace(/^!/, '')

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

	// Prevent collision with another custom command trigger
	const collidingCustom = await db
		.select()
		.from(customCommands)
		.where(eq(customCommands.trigger, cleanTrigger))
		.then(results => results[0])

	if (collidingCustom) {
		throw createError({
			statusCode: 409,
			statusMessage: `Trigger "!${cleanTrigger}" is already in use by custom command.`,
		})
	}

	const customId = `cc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
	await db.insert(customCommands).values({
		id: customId,
		trigger: cleanTrigger,
		response,
		description: description || null,
		enabled: true,
		cost,
		globalCooldown,
		userCooldown,
		permission,
		hidden,
		createdAt: new Date(),
		updatedAt: new Date(),
	})

	await registry.syncWithDb()
	await clearCommandsDirectoryCache()

	return { success: true, id: customId }
})
