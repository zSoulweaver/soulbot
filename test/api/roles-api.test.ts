import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import rolesGetHandler from '~~/server/api/admin/roles.get'
import rolesPutHandler from '~~/server/api/admin/roles.put'
import { db } from '~~/server/database'
import { twitchTokens, users } from '~~/server/database/schema'
import { clearDatabase } from '../helpers'
import { mockApiClient } from '../setup'

describe('Roles Management API Routes', () => {
	beforeEach(async () => {
		await clearDatabase()
		vi.clearAllMocks()

		// Seed a streamer token in DB
		await db.insert(twitchTokens).values({
			accountType: 'streamer',
			userId: 'streamer-id-123',
			userName: 'streamerchannel',
			displayName: 'StreamerChannel',
			accessToken: 'access',
			refreshToken: 'refresh',
			scope: '[]',
			obtainmentTimestamp: Date.now(),
		})

		// Configure mock Helix pagination for getModeratorsPaginated
		mockApiClient.moderation = {
			checkUserMod: vi.fn(async () => false),
			getModeratorsPaginated: vi.fn(() => ({
				getNext: vi.fn()
					.mockResolvedValueOnce([
						{ userId: 'mod-1', userName: 'mod_one', userDisplayName: 'ModOne' },
						{ userId: 'mod-2', userName: 'mod_two', userDisplayName: 'ModTwo' },
					])
					.mockResolvedValueOnce([]),
			})),
		} as any
	})

	describe('GET /api/admin/roles', () => {
		it('should fail with 403 if the user is a standard moderator', async () => {
			const mockGetUserSession = (globalThis as any).getUserSession
			mockGetUserSession.mockResolvedValueOnce({
				user: { id: 'moderator-user-id', role: 'moderator' },
			})

			try {
				await rolesGetHandler({} as any)
				expect.fail('Should have failed')
			}
			catch (err: any) {
				expect(err.statusCode).toBe(403)
				expect(err.statusMessage).toContain('Minimum role of "caster" is required')
			}
		})

		it('should fail with 403 if the user is an admin (strict caster check)', async () => {
			const mockGetUserSession = (globalThis as any).getUserSession
			mockGetUserSession.mockResolvedValueOnce({
				user: { id: 'admin-user-id', role: 'admin' },
			})

			try {
				await rolesGetHandler({} as any)
				expect.fail('Should have failed')
			}
			catch (err: any) {
				expect(err.statusCode).toBe(403)
				expect(err.statusMessage).toContain('Only the channel broadcaster can manage administrator roles')
			}
		})

		it('should successfully return the correlated list of moderators for caster', async () => {
			// Seed a moderator in DB with admin role
			await db.insert(users).values({
				id: 'mod-1',
				username: 'mod_one',
				displayName: 'ModOne',
				role: 'admin',
			})

			const mockGetUserSession = (globalThis as any).getUserSession
			mockGetUserSession.mockResolvedValueOnce({
				user: { id: 'streamer-id-123', role: 'caster' },
			})

			const res = await rolesGetHandler({} as any)
			expect(res).toBeDefined()
			expect(res).toHaveLength(2)

			const mod1 = res.find(r => r.id === 'mod-1')
			const mod2 = res.find(r => r.id === 'mod-2')

			expect(mod1).toBeDefined()
			expect(mod1?.username).toBe('mod_one')
			expect(mod1?.role).toBe('admin')
			expect(mod1?.isAdmin).toBe(true)
			expect(mod1?.isNotTwitchMod).toBe(false)

			expect(mod2).toBeDefined()
			expect(mod2?.username).toBe('mod_two')
			expect(mod2?.role).toBe('moderator')
			expect(mod2?.isAdmin).toBe(false)
			expect(mod2?.isNotTwitchMod).toBe(false)
		})

		it('should include DB admins that are no longer Twitch moderators and mark them as such', async () => {
			// Seed an admin in DB who is NOT returned by getModeratorsPaginated
			await db.insert(users).values({
				id: 'old-mod',
				username: 'old_mod',
				displayName: 'OldMod',
				role: 'admin',
			})

			const mockGetUserSession = (globalThis as any).getUserSession
			mockGetUserSession.mockResolvedValueOnce({
				user: { id: 'streamer-id-123', role: 'caster' },
			})

			const res = await rolesGetHandler({} as any)
			expect(res).toBeDefined()
			expect(res).toHaveLength(3) // 2 twitch mods + 1 old DB admin

			const oldMod = res.find(r => r.id === 'old-mod')
			expect(oldMod).toBeDefined()
			expect(oldMod?.username).toBe('old_mod')
			expect(oldMod?.role).toBe('admin')
			expect(oldMod?.isAdmin).toBe(true)
			expect(oldMod?.isNotTwitchMod).toBe(true)
		})
	})

	describe('PUT /api/admin/roles', () => {
		it('should fail with 403 if the user is a standard moderator', async () => {
			const mockGetUserSession = (globalThis as any).getUserSession
			mockGetUserSession.mockResolvedValueOnce({
				user: { id: 'moderator-user-id', role: 'moderator' },
			})

			try {
				await rolesPutHandler({
					body: {
						userId: 'mod-1',
						username: 'mod_one',
						displayName: 'ModOne',
						isAdmin: true,
					},
				} as any)
				expect.fail('Should have failed')
			}
			catch (err: any) {
				expect(err.statusCode).toBe(403)
			}
		})

		it('should fail with 403 if the user is an admin (strict caster check)', async () => {
			const mockGetUserSession = (globalThis as any).getUserSession
			mockGetUserSession.mockResolvedValueOnce({
				user: { id: 'admin-user-id', role: 'admin' },
			})

			try {
				await rolesPutHandler({
					body: {
						userId: 'mod-1',
						username: 'mod_one',
						displayName: 'ModOne',
						isAdmin: true,
					},
				} as any)
				expect.fail('Should have failed')
			}
			catch (err: any) {
				expect(err.statusCode).toBe(403)
				expect(err.statusMessage).toContain('Only the channel broadcaster can manage administrator roles')
			}
		})

		it('should successfully promote user to admin in DB', async () => {
			const mockGetUserSession = (globalThis as any).getUserSession
			mockGetUserSession.mockResolvedValue({
				user: { id: 'streamer-id-123', role: 'caster' },
			})

			const res = await rolesPutHandler({
				body: {
					userId: 'mod-2',
					username: 'mod_two',
					displayName: 'ModTwo',
					isAdmin: true,
				},
			} as any)

			expect(res.success).toBe(true)

			// Assert in database
			const [dbUser] = await db.select().from(users).where(eq(users.id, 'mod-2'))
			expect(dbUser).toBeDefined()
			expect(dbUser?.role).toBe('admin')
		})

		it('should successfully demote user back to moderator in DB', async () => {
			// Seed a moderator in DB with admin role
			await db.insert(users).values({
				id: 'mod-1',
				username: 'mod_one',
				displayName: 'ModOne',
				role: 'admin',
			})

			const mockGetUserSession = (globalThis as any).getUserSession
			mockGetUserSession.mockResolvedValue({
				user: { id: 'streamer-id-123', role: 'caster' },
			})

			const res = await rolesPutHandler({
				body: {
					userId: 'mod-1',
					username: 'mod_one',
					displayName: 'ModOne',
					isAdmin: false,
				},
			} as any)

			expect(res.success).toBe(true)

			// Assert in database
			const [dbUser] = await db.select().from(users).where(eq(users.id, 'mod-1'))
			expect(dbUser).toBeDefined()
			expect(dbUser?.role).toBe('moderator')
		})
	})
})
