import { eventSubManager } from '~~/server/bot/core/eventsub'
import { botLogger } from '~~/server/utils/logger'
import { getAppSettings } from '~~/server/utils/settings'
import { updateUserPoints } from './service'

export function registerPointsEventSubHandlers() {
	// 1. Follow rewards
	eventSubManager.events.on('follow', async (event) => {
		try {
			const settings = await getAppSettings()
			if (!settings.eventsubPointsFollowEnabled || settings.eventsubPointsFollow <= 0) {
				return
			}
			botLogger.info({ user: event.userName, amount: settings.eventsubPointsFollow }, '[EventSub Points] Rewarding points for follow')
			await updateUserPoints(event.userName, settings.eventsubPointsFollow, 'add')
		}
		catch (err) {
			botLogger.error({ err }, '[EventSub Points] Failed to reward follow points')
		}
	})

	// 2. Subscription rewards
	eventSubManager.events.on('subscription', async (event) => {
		try {
			const settings = await getAppSettings()
			if (!settings.eventsubPointsSubEnabled || settings.eventsubPointsSub <= 0) {
				return
			}
			botLogger.info({ user: event.userName, amount: settings.eventsubPointsSub }, '[EventSub Points] Rewarding points for subscription')
			await updateUserPoints(event.userName, settings.eventsubPointsSub, 'add')
		}
		catch (err) {
			botLogger.error({ err }, '[EventSub Points] Failed to reward subscription points')
		}
	})

	// 3. Subscription Gift rewards (points rewarded to the gifter)
	eventSubManager.events.on('subscription.gift', async (event) => {
		try {
			const settings = await getAppSettings()
			if (!settings.eventsubPointsGiftEnabled || settings.eventsubPointsGift <= 0 || !event.gifterName) {
				return
			}
			botLogger.info({ gifter: event.gifterName, amount: settings.eventsubPointsGift }, '[EventSub Points] Rewarding points for subscription gift')
			await updateUserPoints(event.gifterName, settings.eventsubPointsGift, 'add')
		}
		catch (err) {
			botLogger.error({ err }, '[EventSub Points] Failed to reward sub-gift points')
		}
	})

	// 4. Cheer / Bits rewards
	eventSubManager.events.on('cheer', async (event) => {
		try {
			const settings = await getAppSettings()
			if (!settings.eventsubPointsCheerEnabled || settings.eventsubPointsCheer <= 0 || !event.userName) {
				return
			}
			const totalPoints = event.bits * settings.eventsubPointsCheer
			if (totalPoints <= 0)
				return

			botLogger.info({ user: event.userName, bits: event.bits, amount: totalPoints }, '[EventSub Points] Rewarding points for cheer')
			await updateUserPoints(event.userName, totalPoints, 'add')
		}
		catch (err) {
			botLogger.error({ err }, '[EventSub Points] Failed to reward cheer points')
		}
	})
}
