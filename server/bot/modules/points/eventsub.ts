import { eventSubManager } from '~~/server/bot/core/eventsub'
import { botLogger } from '~~/server/utils/logger'
import { getAppSettings } from '~~/server/utils/settings'
import { updateUserPoints } from './service'

async function rewardPoints(
	enabled: boolean,
	amount: number,
	username: string | null | undefined,
	reason: string,
	logContext?: Record<string, any>,
) {
	if (!enabled || amount <= 0 || !username) {
		return
	}

	botLogger.info({ ...logContext, amount }, `[EventSub Points] Rewarding points for ${reason}`)
	await updateUserPoints(username, amount, 'add')
}

export function registerPointsEventSubHandlers() {
	eventSubManager.events.on('follow', async (event) => {
		try {
			const settings = await getAppSettings()
			await rewardPoints(
				settings.eventsubPointsFollowEnabled,
				settings.eventsubPointsFollow,
				event.userName,
				'follow',
				{ user: event.userName },
			)
		}
		catch (err) {
			botLogger.error({ err }, '[EventSub Points] Failed to reward follow points')
		}
	})

	eventSubManager.events.on('subscription', async (event) => {
		try {
			const settings = await getAppSettings()
			await rewardPoints(
				settings.eventsubPointsSubEnabled,
				settings.eventsubPointsSub,
				event.userName,
				'subscription',
				{ user: event.userName },
			)
		}
		catch (err) {
			botLogger.error({ err }, '[EventSub Points] Failed to reward subscription points')
		}
	})

	eventSubManager.events.on('subscription.gift', async (event) => {
		try {
			const settings = await getAppSettings()
			await rewardPoints(
				settings.eventsubPointsGiftEnabled,
				settings.eventsubPointsGift,
				event.gifterName,
				'subscription gift',
				{ gifter: event.gifterName },
			)
		}
		catch (err) {
			botLogger.error({ err }, '[EventSub Points] Failed to reward sub-gift points')
		}
	})

	eventSubManager.events.on('cheer', async (event) => {
		try {
			const settings = await getAppSettings()
			const amount = event.bits * settings.eventsubPointsCheer
			await rewardPoints(
				settings.eventsubPointsCheerEnabled,
				amount,
				event.userName,
				'cheer',
				{ user: event.userName, bits: event.bits },
			)
		}
		catch (err) {
			botLogger.error({ err }, '[EventSub Points] Failed to reward cheer points')
		}
	})
}
