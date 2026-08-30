import process from 'node:process'
import { botLogger } from '~~/server/utils/logger'
import { getAppSettingsSync, refreshAppSettingsCache } from '~~/server/utils/settings'
import { activityTracker } from './core/activity-tracker'
import { handleChatMessage } from './core/chat-dispatcher'
import { handleCommand } from './core/command-dispatcher'
import { engineRegistry } from './core/engine-registry'
import { registry } from './core/registry'
import { templateRegistry } from './core/templates'
import { adsModule } from './modules/advertisements'
import { adsEngine, startAdsEngine, stopAdsEngine } from './modules/advertisements/engine'
import { registerAlertsEventSubHandlers } from './modules/alerts/eventsub'
import { commandsModule } from './modules/commands'
import { deathsModule } from './modules/deaths'
import { pointsModule } from './modules/points'
import { registerPointsEventSubHandlers } from './modules/points/eventsub'
import { gambleModule } from './modules/points/gamble'
import { payoutEngine, seedDefaultExclusions, startPayoutEngine, stopPayoutEngine } from './modules/points/payout'
import { vaultModule } from './modules/points/vault'
import { spotifyModule } from './modules/spotify'
import { spotifyQueueEngine, startSpotifyQueueEngine, stopSpotifyQueueEngine } from './modules/spotify/queue-engine'
import { startTimerEngine, stopTimerEngine, timerEngine } from './modules/timers'
import { twitchModule } from './modules/twitch'
import { registerTwitchEventSubHandlers } from './modules/twitch/eventsub'
import { watchtimeModule } from './modules/watchtime'
import { avatarSyncEngine, startAvatarSyncEngine, stopAvatarSyncEngine } from './services/avatar-sync'

let isRegistryInitialized = false
let isBotInitialized = false

// Register all background engines once into the central EngineRegistry
engineRegistry.register(activityTracker)
engineRegistry.register(payoutEngine)
engineRegistry.register(timerEngine)
engineRegistry.register(spotifyQueueEngine)
engineRegistry.register(adsEngine)
engineRegistry.register(avatarSyncEngine)

export function initRegistry() {
	if (isRegistryInitialized)
		return
	botLogger.info('Initializing registry modules...')
	registry.register(pointsModule)
	registry.register(gambleModule)
	registry.register(vaultModule)
	registry.register(commandsModule)
	registry.register(twitchModule)
	registry.register(spotifyModule)
	registry.register(watchtimeModule)
	registry.register(adsModule)
	registry.register(deathsModule)
	isRegistryInitialized = true
}

export function initBot() {
	initRegistry()

	if (isBotInitialized)
		return
	isBotInitialized = true

	// Register modular EventSub event listeners
	registerPointsEventSubHandlers()
	registerAlertsEventSubHandlers()
	registerTwitchEventSubHandlers()

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
		// Initialize the vault manager timer if active
		const { initVaultManager } = await import('./modules/points/vault-manager')
		await initVaultManager()
	}).catch((err) => {
		botLogger.error({ err }, 'Failed to warm up settings cache on initBot')
	})

	// Start all background engines via EngineRegistry
	if (process.env.NODE_ENV !== 'test') {
		engineRegistry.startAll().catch(err => botLogger.error({ err }, 'Failed to start engines on initBot'))
	}
}

export {
	adsEngine,
	avatarSyncEngine,
	engineRegistry,
	handleChatMessage,
	handleCommand,
	payoutEngine,
	registry,
	spotifyQueueEngine,
	startAdsEngine,
	startAvatarSyncEngine,
	startPayoutEngine,
	startSpotifyQueueEngine,
	startTimerEngine,
	stopAdsEngine,
	stopAvatarSyncEngine,
	stopPayoutEngine,
	stopSpotifyQueueEngine,
	stopTimerEngine,
	templateRegistry,
	timerEngine,
}
