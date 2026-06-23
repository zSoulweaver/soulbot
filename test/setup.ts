import type { StreamInfo } from '~~/server/bot/services/stream'

import process from 'node:process'
import { createError, defineEventHandler } from 'h3'
import { beforeAll, beforeEach, vi } from 'vitest'
import { initBot, registry, templateRegistry } from '~~/server/bot'

import { requireUserRole } from '~~/server/utils/auth';

(globalThis as any).defineEventHandler = defineEventHandler
;(globalThis as any).defineCachedEventHandler = (handler: any) => defineEventHandler(handler)
;(globalThis as any).createError = createError
;(globalThis as any).getQuery = vi.fn()
;(globalThis as any).sendRedirect = vi.fn()
;(globalThis as any).setCookie = vi.fn()
;(globalThis as any).getCookie = vi.fn()
;(globalThis as any).deleteCookie = vi.fn()
;(globalThis as any).requireUserRole = requireUserRole
;(globalThis as any).getUserSession = vi.fn(async () => ({ user: { id: 'mock-user', role: 'caster' } }))
;(globalThis as any).readValidatedBody = vi.fn(async (event, validator) => {
	return validator(event?.body)
})

;(globalThis as any).getRouterParam = vi.fn((event, paramName) => {
	if (event?.context?.params?.[paramName] !== undefined) {
		return event.context.params[paramName]
	}
	if (paramName === 'username') {
		return (globalThis as any).__mockUsername__
	}
	return undefined
})

;(globalThis as any).readBody = vi.fn(async (event) => {
	return event?.body
})

// Keep a spy on the mocked say method to assert bot replies
export const mockSay = vi.fn(async (_channel: string, _message: string) => {
	// Simple log if needed or noop
})

export const mockAction = vi.fn(async (_channel: string, _message: string) => {
	// Simple log if needed or noop
})

export const mockChatClient = {
	say: mockSay,
	action: vi.fn(async (channel: string, message: string) => {
		await mockAction(channel, message)
		await mockSay(channel, message)
	}),
	isConnected: true,
	connect: vi.fn(async () => {}),
	onConnect: vi.fn(),
	onDisconnect: vi.fn(),
	onMessage: vi.fn(),
}

export const mockApiClient = {
	users: {
		getUserByName: vi.fn(async (username: string) => {
			if (username === 'nonexistent' || username === 'charlie') {
				return null
			}
			return {
				id: `mock-${username}-id`,
				name: username,
				displayName: username.charAt(0).toUpperCase() + username.slice(1),
			}
		}),
		getUsersByNames: vi.fn(async (usernames: string[]) => {
			return usernames
				.filter(u => u !== 'nonexistent' && u !== 'charlie')
				.map(u => ({
					id: `mock-${u}-id`,
					name: u,
					displayName: u.charAt(0).toUpperCase() + u.slice(1),
				}))
		}),
	},
	channels: {
		getChannelFollowers: vi.fn(async (_broadcasterId: string, _userId: string): Promise<{ data: any[], total: number }> => {
			return {
				data: [],
				total: 0,
			}
		}),
	},
}

export const mockGetStreamInfo = vi.fn(async (): Promise<StreamInfo> => ({ isOnline: false }))

vi.mock('~~/server/bot/services/stream', () => ({
	getStreamInfo: () => mockGetStreamInfo(),
}))

// Globally mock the Twurple utility module
vi.mock('~~/server/utils/twurple', async (importOriginal) => {
	const original = await importOriginal<typeof import('~~/server/utils/twurple')>()
	return {
		...original,
		getChatClient: vi.fn(async () => mockChatClient),
		getApiClient: vi.fn(() => mockApiClient),
		startBot: vi.fn(async () => 'started'),
		isBotRunning: vi.fn(() => true),
	}
})

beforeAll(async () => {
	const { execSync } = await import('node:child_process')

	const globalAny = globalThis as any
	if (!globalAny.__db_setup__) {
		const workerId = process.env.VITEST_WORKER_ID || '1'
		try {
			execSync('npx drizzle-kit push --force', {
				env: {
					...process.env,
					DATABASE_URL: `sqlite_test_${workerId}.db`,
				},
				stdio: 'pipe',
			})
		}
		catch (err: any) {
			console.error('Database schema push failed:', err.stdout?.toString() || err.message)
			throw err
		}

		globalAny.__db_setup__ = true
	}

	// Initialize bot commands (points, commands, etc.) and sync in-memory registry
	initBot()
	await registry.syncWithDb()
	await templateRegistry.syncWithDb()
})

beforeEach(() => {
	// Reset the spy so assertions start fresh in every single test case
	mockSay.mockClear()
	mockAction.mockClear()
})

let mockSpotifyToken: any
let mockCurrentlyPlaying: any

;(globalThis as any).__setMockSpotifyToken__ = (val: any) => {
	mockSpotifyToken = val
}
;(globalThis as any).__setMockCurrentlyPlaying__ = (val: any) => {
	mockCurrentlyPlaying = val
}

vi.mock('~~/server/utils/spotify', async (importOriginal) => {
	const original = await importOriginal<typeof import('~~/server/utils/spotify')>()
	return {
		...original,
		getSpotifyToken: vi.fn(async (forceRefresh?: boolean) => {
			if (mockSpotifyToken !== undefined) {
				return mockSpotifyToken
			}
			return original.getSpotifyToken(forceRefresh)
		}),
		getCurrentlyPlaying: vi.fn(async () => {
			if (mockCurrentlyPlaying !== undefined) {
				return mockCurrentlyPlaying
			}
			return original.getCurrentlyPlaying()
		}),
		clearSpotifyTokenCache: vi.fn(() => {
			return original.clearSpotifyTokenCache()
		}),
	}
})
