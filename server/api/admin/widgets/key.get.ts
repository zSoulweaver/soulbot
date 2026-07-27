import { requireUserRole } from '~~/server/utils/auth'
import { getWidgetSecretKey } from '~~/server/utils/widgets'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'caster')
	const key = await getWidgetSecretKey()
	return { key }
})
