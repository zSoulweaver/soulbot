import { GLOBAL_TEMPLATE_VARIABLES, TEMPLATE_SCOPES } from '~~/server/bot/core/template-catalog'
import { requireUserRole } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')

	return {
		globalVariables: GLOBAL_TEMPLATE_VARIABLES,
		scopes: TEMPLATE_SCOPES,
	}
})
