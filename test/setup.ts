import process from 'node:process'
import { createError, defineEventHandler } from 'h3'
import { beforeAll, beforeEach, vi } from 'vitest'
import { initBot, registry, templateRegistry } from '~~/server/bot'

// eslint-disable-next-line import/newline-after-import
;(globalThis as any).defineEventHandler = defineEventHandler
;(globalThis as any).createError = createError
;(globalThis as any).readValidatedBody = vi.fn(async (event, validator) => {
	return validator(event?.body)
})

;(globalThis as any).getRouterParam = vi.fn((event, paramName) => {
	if (paramName === 'username') {
		return event?.context?.params?.username || (globalThis as any).__mockUsername__
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

export const mockChatClient = {
	say: mockSay,
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
	},
}

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
		console.log('[Test Setup] Pushing schema to sqlite_test.db...')
		execSync('npx drizzle-kit push --force', {
			env: {
				...process.env,
				DATABASE_URL: 'sqlite_test.db',
			},
			stdio: 'inherit', // Stream logs to see potential errors
		})

		globalAny.__db_setup__ = true
	}

	console.log('[Test Setup] Initializing bot registry and syncing with test DB...')
	// Initialize bot commands (points, commands, etc.) and sync in-memory registry
	initBot()
	await registry.syncWithDb()
	await templateRegistry.syncWithDb()
})

beforeEach(() => {
	// Reset the spy so assertions start fresh in every single test case
	mockSay.mockClear()
})
