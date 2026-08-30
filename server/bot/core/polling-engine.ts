import { botLogger } from '~~/server/utils/logger'

export interface PollingEngineOptions {
	name: string
	intervalMs: number
	action: () => Promise<void> | void
	runImmediately?: boolean
}

export interface EngineStatus {
	name: string
	isRunning: boolean
	isExecuting: boolean
	intervalMs: number
	runCount: number
	lastRunAt: Date | null
	lastError: string | null
}

export class PollingEngine {
	public readonly name: string
	private intervalMs: number
	private action: () => Promise<void> | void
	private runImmediately: boolean

	private timerId: NodeJS.Timeout | null = null
	private _isRunning = false
	private _isExecuting = false
	private _runCount = 0
	private _lastRunAt: Date | null = null
	private _lastError: string | null = null

	constructor(options: PollingEngineOptions) {
		this.name = options.name
		this.intervalMs = options.intervalMs
		this.action = options.action
		this.runImmediately = options.runImmediately ?? false
	}

	public get isRunning(): boolean {
		return this._isRunning
	}

	public get isExecuting(): boolean {
		return this._isExecuting
	}

	public start(): void {
		if (this._isRunning) {
			return
		}

		this._isRunning = true
		botLogger.info(`[${this.name}] Starting background polling engine (${Math.round(this.intervalMs / 1000)}s interval)...`)

		if (this.runImmediately) {
			this.triggerTick().finally(() => {
				if (this._isRunning) {
					this.scheduleNext()
				}
			})
		}
		else {
			this.scheduleNext()
		}
	}

	public stop(): void {
		if (!this._isRunning && !this.timerId) {
			return
		}

		this._isRunning = false
		if (this.timerId) {
			clearTimeout(this.timerId)
			this.timerId = null
		}
		botLogger.info(`[${this.name}] Stopped background polling engine.`)
	}

	public async triggerTick(): Promise<void> {
		if (this._isExecuting) {
			botLogger.debug(`[${this.name}] Tick already in progress, skipping concurrent trigger.`)
			return
		}

		this._isExecuting = true
		this._runCount++
		this._lastRunAt = new Date()

		try {
			await this.action()
			this._lastError = null
		}
		catch (err: any) {
			const errMsg = err?.message || String(err)
			this._lastError = errMsg
			botLogger.error({ err, engine: this.name }, `[${this.name}] Error during engine tick execution`)
		}
		finally {
			this._isExecuting = false
		}
	}

	public getStatus(): EngineStatus {
		return {
			name: this.name,
			isRunning: this._isRunning,
			isExecuting: this._isExecuting,
			intervalMs: this.intervalMs,
			runCount: this._runCount,
			lastRunAt: this._lastRunAt,
			lastError: this._lastError,
		}
	}

	private scheduleNext(): void {
		if (!this._isRunning) {
			return
		}

		this.timerId = setTimeout(async () => {
			if (!this._isRunning) {
				return
			}

			await this.triggerTick()

			if (this._isRunning) {
				this.scheduleNext()
			}
		}, this.intervalMs)

		this.timerId.unref?.()
	}
}
