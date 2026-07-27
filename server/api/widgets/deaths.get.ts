import { getCurrentGameName, getOrCreateGameDeathRecord } from '~~/server/bot/modules/deaths/utils'
import { getWidgetConfig, validateWidgetSecretKey } from '~~/server/utils/widgets'

export default defineEventHandler(async (event) => {
	await validateWidgetSecretKey(event)

	const gameName = await getCurrentGameName()
	const record = await getOrCreateGameDeathRecord(gameName)
	const widget = await getWidgetConfig('deaths')

	if (!widget) {
		throw createError({
			statusCode: 404,
			statusMessage: 'Widget configuration not found',
		})
	}

	const formattedText = widget.template
		.replace(/\{count\}/g, String(record.deaths))
		.replace(/\{deaths\}/g, String(record.deaths))
		.replace(/\{game\}/g, record.gameName)

	return {
		gameName: record.gameName,
		deaths: record.deaths,
		template: widget.template,
		styles: widget.styles,
		enabled: widget.enabled,
		formattedText,
	}
})
