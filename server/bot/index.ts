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
	console.log('[Bot] Initializing registry modules...')
	registry.register(pointsModule)
	registry.register(commandsModule)
	isRegistryInitialized = true
}

export function initBot() {
	initRegistry()

	// Start the active chatter watch-time points payout engine
	startPayoutEngine()
}

export { handleChatMessage, handleCommand, registry, startPayoutEngine, templateRegistry }
