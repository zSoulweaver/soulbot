import { db } from '~~/server/database'
import { settings } from '~~/server/database/schema'

export default defineEventHandler(async () => {
	const dbSettings = await db.select().from(settings)

	const intervalRow = dbSettings.find(s => s.key === 'points.payout_interval')
	const amountRow = dbSettings.find(s => s.key === 'points.payout_amount')

	return {
		interval: intervalRow ? Math.max(1, Number(intervalRow.value)) : 5,
		amount: amountRow ? Math.max(0, Number(amountRow.value)) : 5,
	}
})
