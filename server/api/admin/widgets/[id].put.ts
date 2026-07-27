import { requireUserRole } from '~~/server/utils/auth'
import { updateWidgetConfig } from '~~/server/utils/widgets'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'caster')
	const id = getRouterParam(event, 'id')
	if (!id) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Widget ID is required',
		})
	}

	const body = await readBody(event)
	const updated = await updateWidgetConfig(id, {
		template: body?.template,
		styles: body?.styles,
		enabled: body?.enabled,
	})

	return updated
})
