import process from 'node:process'
import { describe, expect, it } from 'vitest'
import { requireUserRole } from '~~/server/utils/auth'

describe('requireUserRole utility', () => {
	it('should bypass checks when NODE_ENV is test', async () => {
		// Since NODE_ENV is 'test' by default, calling it should return the mock caster user directly
		const user = await requireUserRole({} as any)
		expect(user).toBeDefined()
		expect(user.role).toBe('caster')
	})

	it('should validate roles when NODE_ENV is not test', async () => {
		const originalEnv = process.env.NODE_ENV
		// Temporarily change environment to simulate live server execution
		process.env.NODE_ENV = 'production'

		const mockGetUserSession = (globalThis as any).getUserSession

		try {
			// 1. Unauthenticated request (no session at all)
			mockGetUserSession.mockResolvedValueOnce({} as any)
			await expect(requireUserRole({} as any)).rejects.toThrow('Unauthorized')

			// 2. Insufficient permissions (viewer tries to perform moderator action)
			mockGetUserSession.mockResolvedValueOnce({
				user: { id: '1', role: 'viewer' },
			} as any)
			await expect(requireUserRole({} as any, 'moderator')).rejects.toThrow('Forbidden')

			// 3. Sufficient permissions (moderator performs moderator action)
			mockGetUserSession.mockResolvedValueOnce({
				user: { id: '2', role: 'moderator' },
			} as any)
			const modUser = await requireUserRole({} as any, 'moderator')
			expect(modUser.role).toBe('moderator')

			// 4. Higher permissions (caster performs moderator action due to hierarchy)
			mockGetUserSession.mockResolvedValueOnce({
				user: { id: '3', role: 'caster' },
			} as any)
			const casterUser = await requireUserRole({} as any, 'moderator')
			expect(casterUser.role).toBe('caster')
		}
		finally {
			// Restore environment to avoid affecting other tests
			process.env.NODE_ENV = originalEnv
		}
	})
})
