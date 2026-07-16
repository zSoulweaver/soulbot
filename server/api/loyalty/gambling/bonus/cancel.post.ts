import { cancelBonusEnd, endBonusEvent } from '~~/server/bot/modules/points/bonus-manager'
import { requireUserRole } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
	// Allow moderators and casters to cancel the bonus event
	await requireUserRole(event, 'moderator')

	// Cancel any active setTimeout timer
	cancelBonusEnd()

	// Terminate the event early, clearing the end time and broadcasting the end announcement message
	await endBonusEvent()

	return { success: true }
})
