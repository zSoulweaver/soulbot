import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import rolesGetHandler from '~~/server/api/admin/roles.get'
import rolesPutHandler from '~~/server/api/admin/roles.put'
import { eventSubManager } from '~~/server/bot/core/eventsub'
import { db } from '~~/server/database'
import { twitchTokens, users } from '~~/server/database/schema'
import { syncModeratorRoles } from '~~/server/utils/twurple'
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
				expect(err.statusMessage).toContain('Only the channel broadcaster')
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
				expect(err.statusMessage).toContain('Only the channel broadcaster')
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

			expect(mod2).toBeDefined()
			expect(mod2?.username).toBe('mod_two')
			expect(mod2?.role).toBe('moderator')
			expect(mod2?.isAdmin).toBe(false)
		})

		it('should automatically demote DB admins that are no longer Twitch moderators', async () => {
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
			expect(res).toHaveLength(2) // Only the 2 active Twitch mods

			// Assert that the user was demoted to 'viewer' in the DB
			const [dbUser] = await db.select().from(users).where(eq(users.id, 'old-mod'))
			expect(dbUser).toBeDefined()
			expect(dbUser?.role).toBe('viewer')
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
				expect(err.statusMessage).toContain('Only the channel broadcaster')
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

	describe('Moderator Role Synchronization and Revocation', () => {
		it('should demote unmodded users to viewer and preserve valid moderators', async () => {
			// Seed users
			await db.insert(users).values([
				{ id: 'mod-1', username: 'mod_one', displayName: 'ModOne', role: 'admin' },
				{ id: 'mod-2', username: 'mod_two', displayName: 'ModTwo', role: 'moderator' },
				{ id: 'unmodded-admin', username: 'unmod_admin', displayName: 'UnmodAdmin', role: 'admin' },
				{ id: 'unmodded-mod', username: 'unmod_mod', displayName: 'UnmodMod', role: 'moderator' },
				{ id: 'streamer-id-123', username: 'streamerchannel', displayName: 'StreamerChannel', role: 'caster' },
			])

			// Run sync with only mod-1 and mod-2 in active Twitch moderators list
			await syncModeratorRoles(['mod-1', 'mod-2'])

			// Verify mod-1 and mod-2 retain their roles
			const [u1] = await db.select().from(users).where(eq(users.id, 'mod-1'))
			expect(u1?.role).toBe('admin')

			const [u2] = await db.select().from(users).where(eq(users.id, 'mod-2'))
			expect(u2?.role).toBe('moderator')

			// Verify unmodded-admin and unmodded-mod are demoted to viewer
			const [uUnmodAdmin] = await db.select().from(users).where(eq(users.id, 'unmodded-admin'))
			expect(uUnmodAdmin?.role).toBe('viewer')

			const [uUnmodMod] = await db.select().from(users).where(eq(users.id, 'unmodded-mod'))
			expect(uUnmodMod?.role).toBe('viewer')

			// Verify streamer (caster) is never demoted
			const [uCaster] = await db.select().from(users).where(eq(users.id, 'streamer-id-123'))
			expect(uCaster?.role).toBe('caster')
		})

		it('should handle EventSub moderator.add and moderator.remove events correctly', async () => {
			// Seed a viewer
			await db.insert(users).values({
				id: 'user-789',
				username: 'test_viewer',
				displayName: 'TestViewer',
				role: 'viewer',
			})

			// Simulate moderator.add
			await eventSubManager.simulate('moderator.add', {
				userId: 'user-789',
				userName: 'test_viewer',
				userDisplayName: 'TestViewer',
				broadcasterId: 'streamer-id-123',
				broadcasterName: 'streamerchannel',
				broadcasterDisplayName: 'StreamerChannel',
			} as any)

			// Assert promoted to moderator in DB
			const [uAdd] = await db.select().from(users).where(eq(users.id, 'user-789'))
			expect(uAdd?.role).toBe('moderator')

			// Promote user to admin in DB manually
			await db.update(users).set({ role: 'admin' }).where(eq(users.id, 'user-789'))

			// Simulate moderator.remove
			await eventSubManager.simulate('moderator.remove', {
				userId: 'user-789',
				userName: 'test_viewer',
				userDisplayName: 'TestViewer',
				broadcasterId: 'streamer-id-123',
				broadcasterName: 'streamerchannel',
				broadcasterDisplayName: 'StreamerChannel',
			} as any)

			// Assert demoted to viewer in DB
			const [uRemove] = await db.select().from(users).where(eq(users.id, 'user-789'))
			expect(uRemove?.role).toBe('viewer')
		})
	})
})
