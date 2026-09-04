import { auditStoredTemplates } from '~~/server/bot/core/template-audit'
import { requireUserRole } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')
	return await auditStoredTemplates()
})
