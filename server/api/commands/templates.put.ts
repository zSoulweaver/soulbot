import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { templateRegistry } from '~~/server/bot/core/templates'
import { db } from '~~/server/database'
import { commandTemplates } from '~~/server/database/schema'
import { requireUserRole } from '~~/server/utils/auth'

const saveTemplatesSchema = z.object({
	templates: z.array(
		z.object({
			id: z.string().min(1),
			template: z.string().min(1),
		}),
	),
})

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')
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

	for (const templateItem of templates) {
		const existingDefinition = templateRegistry.get(templateItem.id)
		if (!existingDefinition) {
			throw createError({
				statusCode: 404,
				statusMessage: `Template ID "${templateItem.id}" is not defined by any command module.`,
			})
		}
	}

	for (const templateItem of templates) {
		const definition = templateRegistry.get(templateItem.id)!
		const isDefault = templateItem.template === definition.default

		if (isDefault) {
			await db
				.delete(commandTemplates)
				.where(eq(commandTemplates.id, templateItem.id))
		}
		else {
			const existingRecord = await db
				.select()
				.from(commandTemplates)
				.where(eq(commandTemplates.id, templateItem.id))
				.then(results => results[0])

			if (existingRecord) {
				await db
					.update(commandTemplates)
					.set({
						template: templateItem.template,
						updatedAt: new Date(),
					})
					.where(eq(commandTemplates.id, templateItem.id))
			}
			else {
				await db.insert(commandTemplates).values({
					id: templateItem.id,
					template: templateItem.template,
					updatedAt: new Date(),
				})
			}
		}
	}

	await templateRegistry.syncWithDb()

	return { success: true }
})
