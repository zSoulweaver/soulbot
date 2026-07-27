import { requireUserRole } from '~~/server/utils/auth'
import { getWidgetConfig, getWidgetSecretKey } from '~~/server/utils/widgets'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'caster')
	const key = await getWidgetSecretKey()
	const deathsWidget = await getWidgetConfig('deaths')

	return {
		key,
		widgets: [deathsWidget],
	}
})
