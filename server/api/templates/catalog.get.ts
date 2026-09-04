import { initRegistry } from '~~/server/bot'
import { templateRegistry } from '~~/server/bot/core/templates'
import { requireUserRole } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')
	initRegistry()
	await templateRegistry.syncWithDb()

	return templateRegistry.getCatalog()
})
