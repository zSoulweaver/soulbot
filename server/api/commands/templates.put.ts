import { eq } from 'drizzle-orm'
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
	for (const tpl of templates) {
		const exists = templateRegistry.get(tpl.id)
		if (!exists) {
			throw createError({
				statusCode: 404,
				statusMessage: `Template ID "${tpl.id}" is not defined by any command module.`,
			})
		}
	}

	// 2. Perform sequential upserts for the template overrides
	for (const tpl of templates) {
		const existing = await db
			.select()
			.from(commandTemplates)
			.where(eq(commandTemplates.id, tpl.id))
			.then(res => res[0])

		if (existing) {
			await db
				.update(commandTemplates)
				.set({
					template: tpl.template,
					updatedAt: new Date(),
				})
				.where(eq(commandTemplates.id, tpl.id))
		}
		else {
			await db.insert(commandTemplates).values({
				id: tpl.id,
				template: tpl.template,
				updatedAt: new Date(),
			})
		}
	}

	// 3. Hot-reload templates inside the live bot execution engine
	await templateRegistry.syncWithDb()

	return { success: true }
})
