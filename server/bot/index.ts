import { handleMessage } from './core/dispatcher'
import { registry } from './core/registry'
import { templateRegistry } from './core/templates'
import { pointsCommand } from './modules/points'

export function initBot() {
	console.log('[Bot] Initializing registry...')
	registry.register(pointsCommand)
	console.log('[Bot] Registered command: points')
	// register other commands here
}

export { handleMessage, registry, templateRegistry }
