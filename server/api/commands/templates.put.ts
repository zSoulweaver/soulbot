import { inArray, sql } from 'drizzle-orm'
import { z } from 'zod'
import { templateRegistry } from '~~/server/bot/core/templates'
import { db } from '~~/server/database'
import { commandTemplates } from '~~/server/database/schema'

const saveTemplatesSchema = z.object({
	templates: z.array(
		z.object({
			id: z.string().min(1),
			template: z.string().min(1),
		}),
	),
})

export default defineEventHandler(async (event) => {
	const body = await readBody(event)
	const parsed = saveTemplatesSchema.safeParse(body)

	if (!parsed.success) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid command templates data',
			data: parsed.error.format(),
		})
	}

	const { templates } = parsed.data

	// 1. Verify all template IDs exist in the template registry
	for (const templateItem of templates) {
		const existingDefinition = templateRegistry.get(templateItem.id)
		if (!existingDefinition) {
			throw createError({
				statusCode: 404,
				statusMessage: `Template ID "${templateItem.id}" is not defined by any command module.`,
			})
		}
	}

	// 2. Perform batched upserts or deletes for the template overrides
	const idsToDelete: string[] = []
	const itemsToUpsert: { id: string, template: string, updatedAt: Date }[] = []

	for (const templateItem of templates) {
		const definition = templateRegistry.get(templateItem.id)!
		const isDefault = templateItem.template === definition.default

		if (isDefault) {
			idsToDelete.push(templateItem.id)
		}
		else {
			itemsToUpsert.push({
				id: templateItem.id,
				template: templateItem.template,
				updatedAt: new Date(),
			})
		}
	}

	if (idsToDelete.length > 0) {
		await db
			.delete(commandTemplates)
			.where(inArray(commandTemplates.id, idsToDelete))
	}

	if (itemsToUpsert.length > 0) {
		await db
			.insert(commandTemplates)
			.values(itemsToUpsert)
			.onConflictDoUpdate({
				target: commandTemplates.id,
				set: {
					template: sql`excluded.template`,
					updatedAt: sql`excluded.updated_at`,
				},
			})
	}

	// 3. Hot-reload templates inside the live bot execution engine
	await templateRegistry.syncWithDb()

	return { success: true }
})
