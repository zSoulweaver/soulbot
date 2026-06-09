import process from 'node:process'
import { botLogger } from '~~/server/utils/logger'
import { refreshAppSettingsCache } from '~~/server/utils/settings'
import { handleChatMessage } from './core/chat-dispatcher'
import { handleCommand } from './core/command-dispatcher'
import { registry } from './core/registry'
import { templateRegistry } from './core/templates'
import { registerAlertsEventSubHandlers } from './modules/alerts/eventsub'
import { commandsModule } from './modules/commands'
import { pointsModule } from './modules/points'
import { registerPointsEventSubHandlers } from './modules/points/eventsub'
import { gambleModule } from './modules/points/gamble'
import { startPayoutEngine } from './modules/points/payout'
import { spotifyModule } from './modules/spotify'
import { startTimerEngine } from './modules/timers'
import { twitchModule } from './modules/twitch'

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
	isRegistryInitialized = true
}

export function initBot() {
	initRegistry()

	// Register modular EventSub event listeners
	registerPointsEventSubHandlers()
	registerAlertsEventSubHandlers()

	// Warm up settings cache asynchronously
	refreshAppSettingsCache().catch((err) => {
		botLogger.error({ err }, 'Failed to warm up settings cache on initBot')
	})

	// Start the active chatter watch-time points payout engine
	if (process.env.NODE_ENV !== 'test') {
		startPayoutEngine()
		startTimerEngine()
	}
}

export { handleChatMessage, handleCommand, registry, startPayoutEngine, templateRegistry }
