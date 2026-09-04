import { z } from 'zod'
import { resetStoredTemplate } from '~~/server/bot/core/template-audit'
import { requireUserRole } from '~~/server/utils/auth'

const resetTemplateSchema = z.object({
	id: z.string().optional(),
	domain: z.string().optional(),
	field: z.string().optional(),
	targetId: z.string().optional(),
}).refine(data => data.id || data.targetId || data.field || (data.domain === 'ads') || (data.domain && (data.field || data.targetId)), {
	message: 'Must provide either an issue ID, targetId, field, or domain',
})

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')
	const body = await readBody(event)
	const parsed = resetTemplateSchema.safeParse(body)

	if (!parsed.success) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid template reset request',
			data: parsed.error.format(),
		})
	}

	try {
		const result = await resetStoredTemplate(parsed.data)
		return result
	}
	catch (err: any) {
		throw createError({
			statusCode: 400,
			statusMessage: err.message || 'Failed to reset template',
		})
	}
})
