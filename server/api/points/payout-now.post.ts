import { triggerManualPayout } from '~~/server/bot/modules/points/payout'

export default defineEventHandler(async () => {
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
