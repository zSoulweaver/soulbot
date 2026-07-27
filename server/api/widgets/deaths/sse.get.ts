import { createEventStream } from 'h3'
import { botEventBus } from '~~/server/bot/core/events'
import { getCurrentGameName, getOrCreateGameDeathRecord } from '~~/server/bot/modules/deaths/utils'
import { getWidgetConfig, validateWidgetSecretKey } from '~~/server/utils/widgets'

export default defineEventHandler(async (event) => {
	await validateWidgetSecretKey(event)

	const eventStream = createEventStream(event)

	const onDeathsUpdated = async (data: { gameName: string, deaths: number }) => {
		const widget = await getWidgetConfig('deaths')
		if (!widget)
			return
		const formattedText = widget.template
			.replace(/\{count\}/g, String(data.deaths))
			.replace(/\{deaths\}/g, String(data.deaths))
			.replace(/\{game\}/g, data.gameName)

		eventStream.push({
			event: 'deaths:updated',
			data: JSON.stringify({
				gameName: data.gameName,
				deaths: data.deaths,
				formattedText,
			}),
		})
	}

	const onWidgetUpdated = async (data: { widgetId: string, template: string, styles: any }) => {
		if (data.widgetId === 'deaths') {
			const gameName = await getCurrentGameName()
			const record = await getOrCreateGameDeathRecord(gameName)
			const formattedText = data.template
				.replace(/\{count\}/g, String(record.deaths))
				.replace(/\{deaths\}/g, String(record.deaths))
				.replace(/\{game\}/g, record.gameName)

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
