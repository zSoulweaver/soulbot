import { getCurrentGameName, getOrCreateGame } from '~~/server/bot/modules/deaths/utils'
import { formatDeathWidgetText, getWidgetConfig, validateWidgetSecretKey } from '~~/server/utils/widgets'

export default defineEventHandler(async (event) => {
	await validateWidgetSecretKey(event)

	const gameName = await getCurrentGameName()
	const data = await getOrCreateGame(gameName)
	const widget = await getWidgetConfig('deaths')

	if (!widget) {
		throw createError({
			statusCode: 404,
			statusMessage: 'Widget configuration not found',
		})
	}

	const showActiveCounter = widget.styles?.showActiveCounter !== false
	const formattedText = formatDeathWidgetText(
		widget.template,
		data.game.name,
		data.activeCounter.name,
		data.activeCounter.deaths,
		data.totalDeaths,
		showActiveCounter,
	)

	return {
		gameName: data.game.name,
		counterName: data.activeCounter.name,
		deaths: data.activeCounter.deaths,
		totalDeaths: data.totalDeaths,
		template: widget.template,
		styles: widget.styles,
		enabled: widget.enabled,
		formattedText,
	}
})
