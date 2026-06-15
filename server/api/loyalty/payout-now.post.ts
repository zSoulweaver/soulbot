import { triggerManualPayout } from '~~/server/bot/modules/points/payout'
import { requireUserRole } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')
	try {
		await triggerManualPayout()
		return { success: true }
	}
	catch (err: any) {
		throw createError({
			statusCode: 500,
			statusMessage: err.message || 'Failed to trigger manual payout cycle',
		})
	}
})
