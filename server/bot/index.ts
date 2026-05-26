import process from 'node:process'
import { botLogger } from '~~/server/utils/logger'
import { refreshAppSettingsCache } from '~~/server/utils/settings'
import { handleChatMessage } from './core/chat-dispatcher'
import { handleCommand } from './core/command-dispatcher'
import { registry } from './core/registry'
import { templateRegistry } from './core/templates'
import { commandsModule } from './modules/commands'
import { pointsModule } from './modules/points'
import { startPayoutEngine } from './modules/points/payout'

let isRegistryInitialized = false

export function initRegistry() {
	if (isRegistryInitialized)
		return
	botLogger.info('Initializing registry modules...')
	registry.register(pointsModule)
	registry.register(commandsModule)
	isRegistryInitialized = true
}

export function initBot() {
	initRegistry()

	// Warm up settings cache asynchronously
	refreshAppSettingsCache().catch((err) => {
		botLogger.error({ err }, 'Failed to warm up settings cache on initBot')
	})

	// Start the active chatter watch-time points payout engine
	if (process.env.NODE_ENV !== 'test') {
		startPayoutEngine()
	}
}

export { handleChatMessage, handleCommand, registry, startPayoutEngine, templateRegistry }
