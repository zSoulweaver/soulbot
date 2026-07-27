import { requireUserRole } from '~~/server/utils/auth'
import { getWidgetConfig, getWidgetSecretKey } from '~~/server/utils/widgets'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'caster')
	const id = getRouterParam(event, 'id')
	if (!id) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Widget ID is required',
		})
	}

	const widget = await getWidgetConfig(id)
	const key = await getWidgetSecretKey()

	return {
		widget,
		key,
	}
})
