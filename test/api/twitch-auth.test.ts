import { beforeEach, describe, expect, it, vi } from 'vitest'
import twitchAuthHandler from '~~/server/api/bot/auth/twitch.get'
import botRestartHandler from '~~/server/api/bot/restart.post'
import { db } from '~~/server/database'
import { twitchTokens } from '~~/server/database/schema'
import { clearDatabase } from '../helpers'

// Access the globally mocked H3 methods
const mockSetCookie = (globalThis as any).setCookie
const mockGetCookie = (globalThis as any).getCookie
const mockDeleteCookie = (globalThis as any).deleteCookie
const mockGetQuery = (globalThis as any).getQuery
const mockSendRedirect = (globalThis as any).sendRedirect

// Mock Twurple auth methods
vi.mock('@twurple/auth', () => ({
	exchangeCode: vi.fn(async () => ({
		accessToken: 'mock-access-token',
		refreshToken: 'mock-refresh-token',
		expiresIn: 3600,
		obtainmentTimestamp: Date.now(),
		scope: ['chat'],
	})),
	getTokenInfo: vi.fn(async () => ({
		userId: 'mock-user-123',
	})),
}))

// Mock Twurple utility dependencies
const mockStopBot = vi.fn()
const mockInitTwurple = vi.fn()
const mockStartBot = vi.fn()

vi.mock('~~/server/utils/twurple', async (importOriginal) => {
	const original = await importOriginal<typeof import('~~/server/utils/twurple')>()
	return {
		...original,
		stopBot: () => mockStopBot(),
		initTwurple: () => mockInitTwurple(),
		startBot: () => mockStartBot(),
		getApiClient: vi.fn(() => ({
			users: {
				getUserById: vi.fn(async () => ({
					name: 'mockuser',
					displayName: 'MockUser',
				})),
			},
		})),
		getAuthProvider: vi.fn(() => ({
			addUserForToken: vi.fn(async () => {}),
		})),
	}
})

describe('Twitch Authentication & Bot Control API', () => {
	beforeEach(async () => {
		await clearDatabase()
		vi.clearAllMocks()
	})

	describe('GET /api/bot/auth/twitch (Initiation redirect)', () => {
		it('should generate CSRF cookie and redirect to Twitch auth URL', async () => {
			mockGetQuery.mockReturnValueOnce({ type: 'bot' })

			await twitchAuthHandler({} as any)

			// Should set HTTP-only CSRF cookie
			expect(mockSetCookie).toHaveBeenCalledWith(
				expect.any(Object),
				'twitch_oauth_csrf',
				expect.any(String),
				expect.objectContaining({ httpOnly: true }),
			)

			// Should redirect to Twitch authorization URL
			expect(mockSendRedirect).toHaveBeenCalledWith(
				expect.any(Object),
				expect.stringContaining('https://id.twitch.tv/oauth2/authorize'),
			)

			const redirectUrl = mockSendRedirect.mock.calls[0]?.[1] as string
			const csrfToken = mockSetCookie.mock.calls[0]?.[2] as string
			expect(redirectUrl).toContain(`state=bot:${csrfToken}`)
		})

		it('should throw 400 if invalid type is requested', async () => {
			mockGetQuery.mockReturnValueOnce({ type: 'invalid' })

			await expect(twitchAuthHandler({} as any)).rejects.toThrow('Invalid account type')
		})
	})

	describe('GET /api/bot/auth/twitch (OAuth callback)', () => {
		it('should succeed and store tokens when CSRF token matches', async () => {
			const csrfToken = 'secure-random-csrf-token'
			mockGetQuery.mockReturnValueOnce({
				code: 'auth-code-12345',
				state: `streamer:${csrfToken}`,
			})
			mockGetCookie.mockReturnValueOnce(csrfToken)

			await twitchAuthHandler({} as any)

			// CSRF cookie must be deleted
			expect(mockDeleteCookie).toHaveBeenCalledWith(expect.any(Object), 'twitch_oauth_csrf')

			// Verify tokens are stored in SQLite
			const dbTokens = await db.select().from(twitchTokens)
			expect(dbTokens.length).toBe(1)
			const token = dbTokens[0]!
			expect(token.accountType).toBe('streamer')
			expect(token.userName).toBe('mockuser')
			expect(token.displayName).toBe('MockUser')
			expect(token.accessToken).toBe('mock-access-token')

			// Verify redirect back to /setup
			expect(mockSendRedirect).toHaveBeenCalledWith(expect.any(Object), '/setup')
		})

		it('should throw 400 if state parameter is missing', async () => {
			mockGetQuery.mockReturnValueOnce({
				code: 'auth-code-12345',
			})

			await expect(twitchAuthHandler({} as any)).rejects.toThrow('Missing state parameter in callback')
		})

		it('should throw 400 if CSRF verification fails', async () => {
			mockGetQuery.mockReturnValueOnce({
				code: 'auth-code-12345',
				state: 'bot:bad-csrf-token',
			})
			mockGetCookie.mockReturnValueOnce('expected-csrf-token')

			await expect(twitchAuthHandler({} as any)).rejects.toThrow('Invalid state or CSRF token matching failed')
		})
	})

	describe('Defense-in-depth Role Restriction when onboarded', () => {
		beforeEach(async () => {
			await db.insert(twitchTokens).values([
				{
					accountType: 'bot',
					accessToken: 'bot-token',
					refreshToken: 'bot-refresh',
					obtainmentTimestamp: Date.now(),
					scope: '[]',
				},
				{
					accountType: 'streamer',
					accessToken: 'streamer-token',
					refreshToken: 'streamer-refresh',
					obtainmentTimestamp: Date.now(),
					scope: '[]',
				},
			])
		})

		it('should reject viewer with 403 Forbidden', async () => {
			const mockGetUserSession = (globalThis as any).getUserSession
			mockGetUserSession.mockResolvedValue({
				user: { id: 'viewer-user', role: 'viewer' },
			})

			mockGetQuery.mockReturnValueOnce({ type: 'bot' })

			await expect(twitchAuthHandler({} as any)).rejects.toThrow('Forbidden')
		})

		it('should reject moderator with 403 Forbidden', async () => {
			const mockGetUserSession = (globalThis as any).getUserSession
			mockGetUserSession.mockResolvedValue({
				user: { id: 'mod-user', role: 'moderator' },
			})

			mockGetQuery.mockReturnValueOnce({ type: 'bot' })

			await expect(twitchAuthHandler({} as any)).rejects.toThrow('Forbidden')
		})

		it('should reject admin with 403 Forbidden (strict caster enforcement)', async () => {
			const mockGetUserSession = (globalThis as any).getUserSession
			mockGetUserSession.mockResolvedValue({
				user: { id: 'admin-user', role: 'admin' },
			})

			mockGetQuery.mockReturnValueOnce({ type: 'bot' })

			await expect(twitchAuthHandler({} as any)).rejects.toThrow('Forbidden')
		})

		it('should allow caster to initiate auth flow when onboarded', async () => {
			const mockGetUserSession = (globalThis as any).getUserSession
			mockGetUserSession.mockResolvedValue({
				user: { id: 'caster-user', role: 'caster' },
			})

			mockGetQuery.mockReturnValueOnce({ type: 'streamer' })

			await twitchAuthHandler({} as any)

			expect(mockSendRedirect).toHaveBeenCalledWith(
				expect.any(Object),
				expect.stringContaining('https://id.twitch.tv/oauth2/authorize'),
			)
		})
	})

	describe('POST /api/bot/restart', () => {
		it('should successfully stop, re-initialize, and start the bot', async () => {
			mockStopBot.mockResolvedValueOnce('stopped')
			mockInitTwurple.mockResolvedValueOnce(undefined)
			mockStartBot.mockResolvedValueOnce('started')

			const res = await botRestartHandler({} as any)

			expect(res).toEqual({ status: 'ok', message: 'Bot restarted successfully' })
			expect(mockStopBot).toHaveBeenCalled()
			expect(mockInitTwurple).toHaveBeenCalled()
			expect(mockStartBot).toHaveBeenCalled()
		})
	})
})
