import process from 'node:process'
import { botLogger } from '~~/server/utils/logger'
import { getAppSettingsSync, refreshAppSettingsCache } from '~~/server/utils/settings'
import { activityTracker } from './core/activity-tracker'
import { handleChatMessage } from './core/chat-dispatcher'
import { handleCommand } from './core/command-dispatcher'
import { registry } from './core/registry'
import { templateRegistry } from './core/templates'
import { adsModule } from './modules/advertisements'
import { startAdsEngine } from './modules/advertisements/engine'
import { registerAlertsEventSubHandlers } from './modules/alerts/eventsub'
import { commandsModule } from './modules/commands'
import { pointsModule } from './modules/points'
import { registerPointsEventSubHandlers } from './modules/points/eventsub'
import { gambleModule } from './modules/points/gamble'
import { seedDefaultExclusions, startPayoutEngine } from './modules/points/payout'
import { spotifyModule } from './modules/spotify'
import { startSpotifyQueueEngine } from './modules/spotify/queue-engine'
import { startTimerEngine } from './modules/timers'
import { twitchModule } from './modules/twitch'
import { watchtimeModule } from './modules/watchtime'

let isRegistryInitialized = false

export function initRegistry() {
	if (isRegistryInitialized)
		return
	botLogger.info('Initializing registry modules...')
	registry.register(pointsModule)
	registry.register(gambleModule)
	registry.register(commandsModule)
	registry.register(twitchModule)
	registry.register(spotifyModule)
	registry.register(watchtimeModule)
	registry.register(adsModule)
	isRegistryInitialized = true
}

export function initBot() {
	initRegistry()

	// Register modular EventSub event listeners
	registerPointsEventSubHandlers()
	registerAlertsEventSubHandlers()

	// Ensure we have seeded default bots on initialization
	if (process.env.NODE_ENV !== 'test') {
		seedDefaultExclusions().catch(err => botLogger.error({ err }, 'Failed to seed exclusions during init'))
	}

	// Warm up settings cache asynchronously
	refreshAppSettingsCache().then(async () => {
		const appSettings = getAppSettingsSync()
		if (appSettings.spotifyPlaylistTargetId) {
			const { loadTargetPlaylistCache } = await import('~~/server/utils/spotify')
			await loadTargetPlaylistCache(appSettings.spotifyPlaylistTargetId)
		}
		// Initialize the bonus manager timer if active
		const { initBonusManager } = await import('./modules/points/bonus-manager')
		await initBonusManager()
	}).catch((err) => {
		botLogger.error({ err }, 'Failed to warm up settings cache on initBot')
	})

	// Start the active chatter watch-time points payout engine
	if (process.env.NODE_ENV !== 'test') {
		startPayoutEngine()
		activityTracker.start()
		startTimerEngine()
		startSpotifyQueueEngine()
		startAdsEngine()
	}
}

export { handleChatMessage, handleCommand, registry, startPayoutEngine, templateRegistry }
