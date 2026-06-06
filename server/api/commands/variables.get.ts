import { registeredVariables } from '~~/server/bot/core/variables-engine'
import { requireUserRole } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')

	return registeredVariables.map(v => ({
		name: v.name,
		aliases: v.aliases || [],
		description: v.description,
		examples: v.examples,
	}))
})
