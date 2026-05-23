import { getAppSettings } from '~~/server/utils/settings'

export default defineEventHandler(async () => {
	const settings = await getAppSettings()

	return {
		currencyName: settings.currencyName,
		currencyNamePlural: settings.currencyNamePlural,
		payoutInterval: settings.payoutInterval,
		payoutIntervalOffline: settings.payoutIntervalOffline,
		payoutAmount: settings.payoutAmount,
		payoutAmountOffline: settings.payoutAmountOffline,
		activeBonus: settings.activeBonus,
	}
})
