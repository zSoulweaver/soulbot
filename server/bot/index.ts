import { handleMessage } from './core/dispatcher'
import { registry } from './core/registry'
import { pointsCommand } from './modules/points'

export function initBot() {
	registry.register(pointsCommand)
	// register other commands here
}

export { handleMessage, registry }
