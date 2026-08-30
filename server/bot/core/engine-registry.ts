import type { EngineStatus } from './polling-engine'
import { botLogger } from '~~/server/utils/logger'
import { PollingEngine } from './polling-engine'

export interface BackgroundEngine {
	readonly name: string
	start: () => void | Promise<void>
	stop: () => void | Promise<void>
	getStatus?: () => EngineStatus | Record<string, any>
}

class EngineRegistry {
	private engines = new Map<string, BackgroundEngine>()

	public register<T extends BackgroundEngine>(engine: T): T {
		this.engines.set(engine.name, engine)
		return engine
	}

	public get<T extends BackgroundEngine = BackgroundEngine>(name: string): T | undefined {
		return this.engines.get(name) as T | undefined
	}

	public getAll(): BackgroundEngine[] {
		return Array.from(this.engines.values())
	}

	public async startAll(): Promise<void> {
		botLogger.info('[Engine Registry] Starting all registered background engines (%d engines)...', this.engines.size)
		for (const engine of this.engines.values()) {
			try {
				await engine.start()
			}
			catch (err) {
				botLogger.error({ err, engine: engine.name }, `[Engine Registry] Failed to start engine ${engine.name}`)
			}
		}
	}

	public async stopAll(): Promise<void> {
		botLogger.info('[Engine Registry] Stopping all registered background engines (%d engines)...', this.engines.size)
		for (const engine of this.engines.values()) {
			try {
				await engine.stop()
			}
			catch (err) {
				botLogger.error({ err, engine: engine.name }, `[Engine Registry] Failed to stop engine ${engine.name}`)
			}
		}
	}

	public getStatusSummary(): Record<string, any>[] {
		return Array.from(this.engines.values()).map((engine) => {
			if (engine instanceof PollingEngine || (typeof engine.getStatus === 'function')) {
				return engine.getStatus!()
			}
			return {
				name: engine.name,
			}
		})
	}
}

export const engineRegistry = new EngineRegistry()
