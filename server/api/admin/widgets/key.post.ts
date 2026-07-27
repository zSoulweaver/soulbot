import { requireUserRole } from '~~/server/utils/auth'
import { regenerateWidgetSecretKey } from '~~/server/utils/widgets'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'caster')
	const key = await regenerateWidgetSecretKey()
	return { key }
})
