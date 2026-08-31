import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import alertsGetHandler from '~~/server/api/admin/discord/alerts.get'
import alertsPutHandler from '~~/server/api/admin/discord/alerts.put'
import channelsGetHandler from '~~/server/api/admin/discord/channels.get'
import eventsGetHandler from '~~/server/api/admin/discord/events.get'
import eventsPutHandler from '~~/server/api/admin/discord/events.put'
import rolesGetHandler from '~~/server/api/admin/discord/guild-roles.get'
import guildsGetHandler from '~~/server/api/admin/discord/guilds.get'
import settingsGetHandler from '~~/server/api/admin/discord/settings.get'
import settingsPutHandler from '~~/server/api/admin/discord/settings.put'
import { db } from '~~/server/database'
import { settings } from '~~/server/database/schema'
import { refreshAppSettingsCache } from '~~/server/utils/settings'
import { clearDatabase } from '../helpers'

vi.mock('~~/server/utils/discord', () => ({
	isDiscordTokenConfigured: vi.fn(() => true),
	isDiscordConnected: vi.fn(() => true),
	startDiscord: vi.fn(async () => {}),
	stopDiscord: vi.fn(async () => {}),
	getDiscordChannels: vi.fn(async () => [{ id: '123', name: 'general' }]),
	getDiscordRoles: vi.fn(async () => [{ id: 'role-123', name: 'Member', color: '#ff0000', isManageable: true }]),
	getDiscordGuilds: vi.fn(async () => [{ id: 'guild-123', name: 'My Server' }]),
}))

describe('Discord API Routes', () => {
	beforeEach(async () => {
		await clearDatabase()
		await refreshAppSettingsCache()
	})

	describe('Settings Endpoints', () => {
		it('gET should return current connection settings', async () => {
			const res = await settingsGetHandler({} as any)
			expect(res.discordEnabled).toBe(false)
			expect(res.discordGuildId).toBe('')
			expect(res.discordModerationLogEnabled).toBe(false)
			expect(res.discordModerationLogChannelId).toBe('')
			expect(res.isTokenConfigured).toBe(true) // mocked
			expect(res.isDiscordConnected).toBe(true) // mocked
		})

		it('pUT should update configuration settings in DB', async () => {
			const res = await settingsPutHandler({
				body: {
					discordEnabled: true,
					discordGuildId: 'my-guild-123',
					discordModerationLogEnabled: true,
					discordModerationLogChannelId: 'mod-log-ch',
				},
			} as any)

			expect(res.success).toBe(true)

			const dbVal = await db
				.select()
				.from(settings)
				.where(eq(settings.key, 'discord.guild_id'))
				.then(r => r[0])

			expect(dbVal?.value).toBe('my-guild-123')

			const logVal = await db
				.select()
				.from(settings)
				.where(eq(settings.key, 'discord.moderation.log.channel_id'))
				.then(r => r[0])

			expect(logVal?.value).toBe('mod-log-ch')
		})

		it('pUT should fail on validation error', async () => {
			await expect(
				settingsPutHandler({
					body: {
						discordEnabled: true,
						discordGuildId: 'a'.repeat(200), // exceeds limit
					},
				} as any),
			).rejects.toThrow('Invalid Discord settings data')
		})

		it('pUT should fail if enabling Discord without a Guild ID', async () => {
			await expect(
				settingsPutHandler({
					body: {
						discordEnabled: true,
						discordGuildId: '',
					},
				} as any),
			).rejects.toThrow('Cannot enable Discord integration without a Guild ID configured')
		})
	})

	describe('Alerts Endpoints', () => {
		it('gET should return alerts config', async () => {
			const res = await alertsGetHandler({} as any)
			expect(res.discordAlertFollowEnabled).toBe(false)
			expect(res.discordAlertFollowTemplate).toBe('Thank you for the follow, $(sender)!')
			expect(res.isDiscordConnected).toBe(true) // mocked
		})

		it('pUT should update alerts configs in DB', async () => {
			const res = await alertsPutHandler({
				body: {
					discordAlertFollowEnabled: true,
					discordAlertFollowChannelId: 'ch-follow',
					discordAlertFollowTemplate: 'Hello follow!',

					discordAlertSubEnabled: false,
					discordAlertSubChannelId: '',
					discordAlertSubTemplate: 'Hello sub!',

					discordAlertGiftEnabled: false,
					discordAlertGiftChannelId: '',
					discordAlertGiftTemplate: 'Hello gift!',

					discordAlertCheerEnabled: false,
					discordAlertCheerChannelId: '',
					discordAlertCheerTemplate: 'Hello cheer!',
				},
			} as any)

			expect(res.success).toBe(true)

			const dbVal = await db
				.select()
				.from(settings)
				.where(eq(settings.key, 'discord.alerts.follow.template'))
				.then(r => r[0])

			expect(dbVal?.value).toBe('Hello follow!')
		})
	})

	describe('Native Events Endpoints', () => {
		it('gET should return native event and auto-role settings', async () => {
			const res = await eventsGetHandler({} as any)
			expect(res.discordEventJoinEnabled).toBe(false)
			expect(res.discordEventJoinTemplate).toBe('Welcome to $(server), $(user)!')
			expect(res.discordEventLeaveEnabled).toBe(false)
			expect(res.discordEventLeaveTemplate).toBe('$(username) has left the server.')
			expect(res.isDiscordConnected).toBe(true)
		})

		it('pUT should update native event settings in DB', async () => {
			const res = await eventsPutHandler({
				body: {
					discordEventJoinEnabled: true,
					discordEventJoinChannelId: 'ch-join',
					discordEventJoinTemplate: 'Welcome $(user)!',

					discordRolesAutoBestowEnabled: true,
					discordRolesAutoBestowRoles: 'role-123',

					discordEventLeaveEnabled: true,
					discordEventLeaveChannelId: 'ch-leave',
					discordEventLeaveTemplate: 'Goodbye $(username)!',
				},
			} as any)

			expect(res.success).toBe(true)

			const joinVal = await db
				.select()
				.from(settings)
				.where(eq(settings.key, 'discord.events.join.channel_id'))
				.then(r => r[0])

			expect(joinVal?.value).toBe('ch-join')

			const leaveVal = await db
				.select()
				.from(settings)
				.where(eq(settings.key, 'discord.events.leave.template'))
				.then(r => r[0])

			expect(leaveVal?.value).toBe('Goodbye $(username)!')
		})
	})

	describe('Guild Info Queries', () => {
		it('gET channels should fetch text channels', async () => {
			const res = await channelsGetHandler({} as any)
			expect(res).toBeDefined()
			expect(res).toHaveLength(1)
			expect(res![0]!.name).toBe('general')
		})

		it('gET roles should fetch guild roles', async () => {
			const res = await rolesGetHandler({} as any)
			expect(res).toBeDefined()
			expect(res).toHaveLength(1)
			expect(res![0]!.name).toBe('Member')
			expect(res![0]!.color).toBe('#ff0000')
			expect(res![0]!.isManageable).toBe(true)
		})

		it('gET guilds should fetch connected guilds', async () => {
			const res = await guildsGetHandler({} as any)
			expect(res).toBeDefined()
			expect(res).toHaveLength(1)
			expect(res![0]!.name).toBe('My Server')
		})
	})
})
