import { handleMessage } from './core/dispatcher'
import { registry } from './core/registry'
import { templateRegistry } from './core/templates'
import { commandsModule } from './modules/commands'
import { pointsCommand } from './modules/points'

export function initBot() {
	console.log('[Bot] Initializing registry...')
	registry.register(pointsCommand)
	registry.register(commandsModule)
}

export { handleMessage, registry, templateRegistry }
