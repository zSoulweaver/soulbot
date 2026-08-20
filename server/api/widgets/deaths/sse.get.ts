import { createEventStream } from 'h3'
import { botEventBus } from '~~/server/bot/core/events'
import { getCurrentGameName, getOrCreateGame } from '~~/server/bot/modules/deaths/utils'
import { getWidgetConfig, validateWidgetSecretKey } from '~~/server/utils/widgets'

export default defineEventHandler(async (event) => {
	await validateWidgetSecretKey(event)

	const eventStream = createEventStream(event)

	const onDeathsUpdated = async (data: { gameName: string, counterName?: string, deaths: number, totalDeaths?: number }) => {
		const widget = await getWidgetConfig('deaths')
		if (!widget)
			return

		const gameData = await getOrCreateGame(data.gameName)
		const counterName = data.counterName || gameData.activeCounter.name
		const total = data.totalDeaths !== undefined ? data.totalDeaths : gameData.totalDeaths
		const showActiveCounter = widget.styles?.showActiveCounter !== false

		const formattedText = formatDeathWidgetText(
			widget.template,
			data.gameName,
			counterName,
			data.deaths,
			total,
			showActiveCounter,
		)

		eventStream.push({
			event: 'deaths:updated',
			data: JSON.stringify({
				gameName: data.gameName,
				counterName,
				deaths: data.deaths,
				totalDeaths: total,
				formattedText,
			}),
		})
	}

	const onWidgetUpdated = async (data: { widgetId: string, template: string, styles: any }) => {
		if (data.widgetId === 'deaths') {
			const gameName = await getCurrentGameName()
			const gameData = await getOrCreateGame(gameName)
			const showActiveCounter = data.styles?.showActiveCounter !== false

			const formattedText = formatDeathWidgetText(
				data.template,
				gameData.game.name,
				gameData.activeCounter.name,
				gameData.activeCounter.deaths,
				gameData.totalDeaths,
				showActiveCounter,
			)

			eventStream.push({
				event: 'widget:updated',
				data: JSON.stringify({
					template: data.template,
					styles: data.styles,
					formattedText,
				}),
			})
		}
	}

	botEventBus.on('deaths:updated', onDeathsUpdated)
	botEventBus.on('widget:updated', onWidgetUpdated)

	eventStream.onClosed(() => {
		botEventBus.off('deaths:updated', onDeathsUpdated)
		botEventBus.off('widget:updated', onWidgetUpdated)
	})

	return eventStream.send()
})
