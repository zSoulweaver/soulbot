import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { registry } from '~~/server/bot/core/registry'
import { db } from '~~/server/database'
import { commandAliases, customCommands } from '~~/server/database/schema'
import { requireUserRole } from '~~/server/utils/auth'

const deleteCustomCommandSchema = z.object({
	id: z.string().min(1),
})

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')

	const body = await readBody(event)
	const parsed = deleteCustomCommandSchema.safeParse(body)

	if (!parsed.success) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid command deletion payload',
			data: parsed.error.format(),
		})
	}

	const { id } = parsed.data

	// Cascade delete: clean up any aliases targeting this custom command
	const commandId = `custom:${id}`
	await db.delete(commandAliases).where(eq(commandAliases.commandId, commandId))

	await db.delete(customCommands).where(eq(customCommands.id, id))

	await registry.syncWithDb()

	return { success: true }
})
