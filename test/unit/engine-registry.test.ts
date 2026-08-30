import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { engineRegistry } from '~~/server/bot/core/engine-registry'
import { PollingEngine } from '~~/server/bot/core/polling-engine'

describe('PollingEngine & EngineRegistry Unit Tests', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.restoreAllMocks()
		vi.useRealTimers()
	})

	describe('PollingEngine', () => {
		it('should initialize with correct default status', () => {
			const engine = new PollingEngine({
				name: 'test-engine',
				intervalMs: 1000,
				action: () => {},
			})

			expect(engine.name).toBe('test-engine')
			expect(engine.isRunning).toBe(false)
			expect(engine.isExecuting).toBe(false)

			const status = engine.getStatus()
			expect(status.name).toBe('test-engine')
			expect(status.isRunning).toBe(false)
			expect(status.runCount).toBe(0)
			expect(status.lastRunAt).toBeNull()
			expect(status.lastError).toBeNull()
		})

		it('should schedule and execute ticks recursively on start', async () => {
			const actionSpy = vi.fn()
			const engine = new PollingEngine({
				name: 'test-interval',
				intervalMs: 1000,
				action: actionSpy,
			})

			engine.start()
			expect(engine.isRunning).toBe(true)
			expect(actionSpy).not.toHaveBeenCalled()

			// Fast-forward 1 second
			await vi.advanceTimersByTimeAsync(1000)
			expect(actionSpy).toHaveBeenCalledTimes(1)

			// Fast-forward another second
			await vi.advanceTimersByTimeAsync(1000)
			expect(actionSpy).toHaveBeenCalledTimes(2)

			const status = engine.getStatus()
			expect(status.runCount).toBe(2)
			expect(status.lastRunAt).not.toBeNull()

			engine.stop()
			expect(engine.isRunning).toBe(false)

			// Fast-forward again — no more calls after stop
			await vi.advanceTimersByTimeAsync(2000)
			expect(actionSpy).toHaveBeenCalledTimes(2)
		})

		it('should execute immediately if runImmediately is true', async () => {
			const actionSpy = vi.fn()
			const engine = new PollingEngine({
				name: 'test-immediate',
				intervalMs: 1000,
				runImmediately: true,
				action: actionSpy,
			})

			engine.start()
			expect(actionSpy).toHaveBeenCalledTimes(1)

			await vi.advanceTimersByTimeAsync(1000)
			expect(actionSpy).toHaveBeenCalledTimes(2)

			engine.stop()
		})

		it('should prevent overlapping ticks when execution is in progress', async () => {
			let resolveTick: () => void
			const longRunningAction = vi.fn(
				() =>
					new Promise<void>((resolve) => {
						resolveTick = resolve
					}),
			)

			const engine = new PollingEngine({
				name: 'test-overlap',
				intervalMs: 500,
				action: longRunningAction,
			})

			// Trigger first tick
			const tickPromise = engine.triggerTick()
			expect(engine.isExecuting).toBe(true)

			// Attempt concurrent manual tick while executing
			await engine.triggerTick()
			expect(longRunningAction).toHaveBeenCalledTimes(1)

			// Resolve the first tick
			resolveTick!()
			await tickPromise
			expect(engine.isExecuting).toBe(false)
		})

		it('should safely catch errors, record lastError, and continue scheduling', async () => {
			let fail = true
			const faultyAction = vi.fn(async () => {
				if (fail) {
					throw new Error('Something went wrong in tick')
				}
			})

			const engine = new PollingEngine({
				name: 'test-error-boundary',
				intervalMs: 1000,
				action: faultyAction,
			})

			engine.start()

			// First tick throws
			await vi.advanceTimersByTimeAsync(1000)
			expect(faultyAction).toHaveBeenCalledTimes(1)
			expect(engine.getStatus().lastError).toBe('Something went wrong in tick')

			// Engine should still be running and schedule the next tick
			fail = false
			await vi.advanceTimersByTimeAsync(1000)
			expect(faultyAction).toHaveBeenCalledTimes(2)
			expect(engine.getStatus().lastError).toBeNull()

			engine.stop()
		})
	})

	describe('EngineRegistry', () => {
		it('should register engines and retrieve them by name', () => {
			const engineA = new PollingEngine({ name: 'engine-a', intervalMs: 5000, action: () => {} })
			engineRegistry.register(engineA)

			expect(engineRegistry.get('engine-a')).toBe(engineA)
		})

		it('should start and stop all registered engines collectively', async () => {
			const startSpyA = vi.fn()
			const stopSpyA = vi.fn()
			const startSpyB = vi.fn()
			const stopSpyB = vi.fn()

			engineRegistry.register({
				name: 'mock-engine-a',
				start: startSpyA,
				stop: stopSpyA,
			})

			engineRegistry.register({
				name: 'mock-engine-b',
				start: startSpyB,
				stop: stopSpyB,
			})

			await engineRegistry.startAll()
			expect(startSpyA).toHaveBeenCalledTimes(1)
			expect(startSpyB).toHaveBeenCalledTimes(1)

			await engineRegistry.stopAll()
			expect(stopSpyA).toHaveBeenCalledTimes(1)
			expect(stopSpyB).toHaveBeenCalledTimes(1)
		})

		it('should provide status summary for all registered engines', () => {
			const summary = engineRegistry.getStatusSummary()
			expect(Array.isArray(summary)).toBe(true)

			const names = summary.map(s => s.name)
			expect(names).toContain('activity-tracker')
			expect(names).toContain('points-payout')
			expect(names).toContain('timers')
			expect(names).toContain('spotify-queue')
			expect(names).toContain('advertisements')
			expect(names).toContain('avatar-sync')
		})
	})
})
