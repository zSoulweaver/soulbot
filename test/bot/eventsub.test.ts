import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { eventSubManager } from '~~/server/bot/core/eventsub'
import { db } from '~~/server/database'
import { settings, twitchTokens, users } from '~~/server/database/schema'
import { refreshAppSettingsCache } from '~~/server/utils/settings'
import { clearDatabase } from '../helpers'
import { mockApiClient, mockDeleteDiscordMessage, mockSay, mockSendDiscordMessage } from '../setup'

describe('Bot EventSub Integration', () => {
	beforeEach(async () => {
		await clearDatabase()

		// 1. Seed a mock streamer token so that alert handlers can look up the streamer channel name
		await db.insert(twitchTokens).values({
			accountType: 'streamer',
			userId: 'streamer-id',
			userName: 'streamerchannel',
			displayName: 'StreamerChannel',
			accessToken: 'mock-access',
			refreshToken: 'mock-refresh',
			scope: '[]',
			obtainmentTimestamp: Date.now(),
		})

		// Reset settings cache
		await refreshAppSettingsCache()
	})

	describe('Follow EventSub Alerts & Rewards', () => {
		it('should bypass points and alerts when disabled (default state)', async () => {
			await eventSubManager.simulate('follow', {
				userId: 'mock-alice-id',
				userName: 'alice',
				userDisplayName: 'Alice',
			} as any)

			// Alice should not have been created or rewarded points
			const userRecord = await db.select().from(users).where(eq(users.id, 'mock-alice-id')).then(res => res[0])
			expect(userRecord).toBeUndefined()

			// No chat alert should be posted
			expect(mockSay).not.toHaveBeenCalled()
		})

		it('should reward points and post alert when toggled ON in settings', async () => {
			// Enable follow settings in database
			await db.insert(settings).values([
				{ key: 'eventsub.points.follow.enabled', value: 'true', updatedAt: new Date() },
				{ key: 'eventsub.points.follow', value: '150', updatedAt: new Date() },
				{ key: 'eventsub.alert.follow.enabled', value: 'true', updatedAt: new Date() },
				{ key: 'eventsub.alert.follow', value: 'Thank you for following, $(follower)! You have $(points) points.', updatedAt: new Date() },
			])
			await refreshAppSettingsCache()

			await eventSubManager.simulate('follow', {
				userId: 'mock-alice-id',
				userName: 'alice',
				userDisplayName: 'Alice',
			} as any)

			// Alice should be created with 150 points
			const userRecord = await db.select().from(users).where(eq(users.id, 'mock-alice-id')).then(res => res[0])
			expect(userRecord).toBeDefined()
			expect(userRecord?.points).toBe(150)

			// Alert should be rendered with variables and sent to chat client
			expect(mockSay).toHaveBeenCalledTimes(1)
			expect(mockSay.mock.calls[0]?.[0]).toBe('streamerchannel')
			expect(mockSay.mock.calls[0]?.[1]).toBe('Thank you for following, Alice! You have 150 points.')
		})
	})

	describe('Subscription EventSub Alerts & Rewards', () => {
		it('should award points and alert for a subscriber when toggled ON', async () => {
			await db.insert(settings).values([
				{ key: 'eventsub.points.sub.enabled', value: 'true', updatedAt: new Date() },
				{ key: 'eventsub.points.sub', value: '500', updatedAt: new Date() },
				{ key: 'eventsub.alert.sub.enabled', value: 'true', updatedAt: new Date() },
				{ key: 'eventsub.alert.sub', value: 'Welcome to the club, $(subscriber)!', updatedAt: new Date() },
			])
			await refreshAppSettingsCache()

			await eventSubManager.simulate('subscription', {
				userId: 'mock-bob-id',
				userName: 'bob',
				userDisplayName: 'Bob',
				tier: '1000',
				isGift: false,
			} as any)

			const userRecord = await db.select().from(users).where(eq(users.id, 'mock-bob-id')).then(res => res[0])
			expect(userRecord?.points).toBe(500)

			expect(mockSay).toHaveBeenCalledTimes(1)
			expect(mockSay.mock.calls[0]?.[1]).toBe('Welcome to the club, Bob!')
		})
	})

	describe('Gift Subscription EventSub Alerts & Rewards', () => {
		it('should award points to the gifter and alert the chat when toggled ON', async () => {
			await db.insert(settings).values([
				{ key: 'eventsub.points.gift.enabled', value: 'true', updatedAt: new Date() },
				{ key: 'eventsub.points.gift', value: '250', updatedAt: new Date() },
				{ key: 'eventsub.alert.gift.enabled', value: 'true', updatedAt: new Date() },
				{ key: 'eventsub.alert.gift', value: 'Thank you @$(gifter) for gifting $(count) sub(s) to the community!', updatedAt: new Date() },
			])
			await refreshAppSettingsCache()

			await eventSubManager.simulate('subscription.gift', {
				gifterId: 'mock-gifter-id',
				gifterName: 'gifter',
				gifterDisplayName: 'Gifter',
				tier: '1000',
				amount: 5,
			} as any)

			// Gifter gets rewarded points
			const userRecord = await db.select().from(users).where(eq(users.id, 'mock-gifter-id')).then(res => res[0])
			expect(userRecord?.points).toBe(250)

			expect(mockSay).toHaveBeenCalledTimes(1)
			expect(mockSay.mock.calls[0]?.[1]).toBe('Thank you @Gifter for gifting 5 sub(s) to the community!')
		})
	})

	describe('Cheer EventSub Alerts & Rewards', () => {
		it('should reward multiplier-scaled points and alert on cheer events when toggled ON', async () => {
			await db.insert(settings).values([
				{ key: 'eventsub.points.cheer.enabled', value: 'true', updatedAt: new Date() },
				{ key: 'eventsub.points.cheer', value: '3', updatedAt: new Date() }, // 3 points per bit
				{ key: 'eventsub.alert.cheer.enabled', value: 'true', updatedAt: new Date() },
				{ key: 'eventsub.alert.cheer', value: 'Thank you @$(cheerer) for cheering $(bits) bits! Msg: $(message)', updatedAt: new Date() },
			])
			await refreshAppSettingsCache()

			await eventSubManager.simulate('cheer', {
				userId: 'mock-dan-id',
				userName: 'dan',
				userDisplayName: 'Dan',
				bits: 100,
				message: 'Keep up the good work!',
			} as any)

			// Dan gets 3 * 100 = 300 points
			const userRecord = await db.select().from(users).where(eq(users.id, 'mock-dan-id')).then(res => res[0])
			expect(userRecord?.points).toBe(300)

			expect(mockSay).toHaveBeenCalledTimes(1)
			expect(mockSay.mock.calls[0]?.[1]).toBe('Thank you @Dan for cheering 100 bits! Msg: Keep up the good work!')
		})
	})

	describe('Raid EventSub Alerts', () => {
		it('should post chat and Discord messages on incoming raid', async () => {
			await db.insert(settings).values([
				{ key: 'eventsub.alert.raid.enabled', value: 'true', updatedAt: new Date() },
				{ key: 'eventsub.alert.raid', value: 'Thanks for raiding, $(raider) with $(viewers) viewers!', updatedAt: new Date() },
				{ key: 'discord.enabled', value: 'true', updatedAt: new Date() },
				{ key: 'discord.alerts.raid.enabled', value: 'true', updatedAt: new Date() },
				{ key: 'discord.alerts.raid.channel_id', value: 'ch-raid-123', updatedAt: new Date() },
				{ key: 'discord.alerts.raid.template', value: '$(raider) raided with $(viewers) viewers!', updatedAt: new Date() },
			])
			await refreshAppSettingsCache()

			await eventSubManager.simulate('raid', {
				raidingBroadcasterId: 'mock-raider-id',
				raidingBroadcasterName: 'raider',
				raidingBroadcasterDisplayName: 'Raider',
				raidedBroadcasterId: 'streamer-id',
				raidedBroadcasterName: 'streamerchannel',
				raidedBroadcasterDisplayName: 'StreamerChannel',
				viewers: 42,
			} as any)

			// Verify Twitch Chat Alert
			expect(mockSay).toHaveBeenCalledTimes(1)
			expect(mockSay.mock.calls[0]?.[1]).toBe('Thanks for raiding, Raider with 42 viewers!')

			// Verify Discord Alert
			expect((mockSendDiscordMessage as any).mock.calls[0]?.[0]).toBe('ch-raid-123')
			expect((mockSendDiscordMessage as any).mock.calls[0]?.[1]).toBe('Raider raided with 42 viewers!')
		})
	})

	describe('Stream Live/Offline Alerts', () => {
		it('should send fancy embed on live and delete it on offline if remove_offline is true', async () => {
			// Mock Helix API methods on mockApiClient
			(mockApiClient.users as any).getUserById = vi.fn(async (id: string) => ({
				id,
				name: 'streamerchannel',
				displayName: 'StreamerChannel',
				profilePictureUrl: 'https://avatar-url.jpg',
			})) as any

			(mockApiClient.channels as any).getChannelInfoById = vi.fn(async (id: string) => ({
				id,
				title: 'Coding some features!',
				gameName: 'Software and Game Development',
			})) as any

			await db.insert(settings).values([
				{ key: 'eventsub.alert.live.enabled', value: 'true', updatedAt: new Date() },
				{ key: 'eventsub.alert.live', value: 'We are live playing $(game): $(title)!', updatedAt: new Date() },
				{ key: 'discord.enabled', value: 'true', updatedAt: new Date() },
				{ key: 'discord.alerts.live.enabled', value: 'true', updatedAt: new Date() },
				{ key: 'discord.alerts.live.channel_id', value: 'ch-live-123', updatedAt: new Date() },
				{ key: 'discord.alerts.live.template', value: '@everyone $(broadcaster) is now live!', updatedAt: new Date() },
				{ key: 'discord.alerts.live.remove_offline', value: 'true', updatedAt: new Date() },
				{ key: 'eventsub.alert.offline.enabled', value: 'true', updatedAt: new Date() },
				{ key: 'eventsub.alert.offline', value: 'Stream over!', updatedAt: new Date() },
				{ key: 'discord.alerts.offline.enabled', value: 'true', updatedAt: new Date() },
				{ key: 'discord.alerts.offline.channel_id', value: 'ch-offline-123', updatedAt: new Date() },
				{ key: 'discord.alerts.offline.template', value: 'Goodbye!', updatedAt: new Date() },
			])
			await refreshAppSettingsCache()

			// 1. Simulate Stream going Online
			await eventSubManager.simulate('stream.online', {
				broadcasterId: 'streamer-id',
				broadcasterName: 'streamerchannel',
				broadcasterDisplayName: 'StreamerChannel',
				id: 'stream-123',
				type: 'live',
				startDate: new Date(),
			} as any)

			// Verify Twitch live alert
			expect(mockSay).toHaveBeenCalledTimes(1)
			expect(mockSay.mock.calls[0]?.[1]).toBe('We are live playing Software and Game Development: Coding some features!!')

			// Verify Discord live embed alert
			expect(mockSendDiscordMessage).toHaveBeenCalledTimes(1)
			expect((mockSendDiscordMessage as any).mock.calls[0]?.[0]).toBe('ch-live-123')
			expect((mockSendDiscordMessage as any).mock.calls[0]?.[1]).toBe('@everyone StreamerChannel is now live!')
			expect((mockSendDiscordMessage as any).mock.calls[0]?.[2]).toEqual({
				title: 'StreamerChannel just went online on Twitch!',
				url: 'https://twitch.tv/streamerchannel',
				thumbnailUrl: 'https://avatar-url.jpg',
				fields: [
					{ name: 'Now Playing', value: 'Software and Game Development', inline: true },
					{ name: 'Stream Status', value: 'Coding some features!', inline: true },
				],
				imageUrl: expect.stringContaining('https://static-cdn.jtvnw.net/previews-ttv/live_user_streamerchannel-640x360.jpg'),
				footerText: 'Twitch',
				footerIconUrl: 'https://static.twitchcdn.net/assets/favicon-32x32-e29e54a2305db3de7191.png',
				timestamp: true,
			})

			// Check that message ID was saved to DB settings
			const lastMsgSetting = await db.select().from(settings).where(eq(settings.key, 'discord.alerts.live.last_message_id')).then(res => res[0])
			expect(lastMsgSetting?.value).toBe('mock-msg-123')

			// 2. Simulate Stream going Offline
			await eventSubManager.simulate('stream.offline', {
				broadcasterId: 'streamer-id',
				broadcasterName: 'streamerchannel',
				broadcasterDisplayName: 'StreamerChannel',
			} as any)

			// Verify Twitch offline alert
			expect(mockSay).toHaveBeenCalledTimes(2)
			expect(mockSay.mock.calls[1]?.[1]).toBe('Stream over!')

			// Verify Discord offline alert message
			expect(mockSendDiscordMessage).toHaveBeenCalledTimes(2)
			expect((mockSendDiscordMessage as any).mock.calls[1]?.[0]).toBe('ch-offline-123')
			expect((mockSendDiscordMessage as any).mock.calls[1]?.[1]).toBe('Goodbye!')

			// Verify Discord live alert message was deleted
			expect(mockDeleteDiscordMessage).toHaveBeenCalledTimes(1)
			expect((mockDeleteDiscordMessage as any).mock.calls[0]?.[0]).toBe('mock-channel-123')
			expect((mockDeleteDiscordMessage as any).mock.calls[0]?.[1]).toBe('mock-msg-123')

			// Check that message ID in DB settings was cleared
			const clearedMsgSetting = await db.select().from(settings).where(eq(settings.key, 'discord.alerts.live.last_message_id')).then(res => res[0])
			expect(clearedMsgSetting?.value).toBe('')
		})
	})

	describe('Moderation EventSub Alerts & Audit Log Embed', () => {
		it('should trigger Twitch chat alert, Discord text alert, and rich Discord moderation log embed on ban and timeout', async () => {
			await db.insert(settings).values([
				{ key: 'eventsub.alert.ban.enabled', value: 'true', updatedAt: new Date() },
				{ key: 'eventsub.alert.ban', value: '$(sender) was banned!', updatedAt: new Date() },
				{ key: 'eventsub.alert.timeout.enabled', value: 'true', updatedAt: new Date() },
				{ key: 'eventsub.alert.timeout', value: '$(sender) was timed out for $(duration)s!', updatedAt: new Date() },
				{ key: 'discord.enabled', value: 'true', updatedAt: new Date() },
				{ key: 'discord.alerts.ban.enabled', value: 'true', updatedAt: new Date() },
				{ key: 'discord.alerts.ban.channel_id', value: 'ch-disc-ban', updatedAt: new Date() },
				{ key: 'discord.alerts.ban.template', value: 'Discord: $(sender) banned!', updatedAt: new Date() },
				{ key: 'discord.moderation.log.enabled', value: 'true', updatedAt: new Date() },
				{ key: 'discord.moderation.log.channel_id', value: 'ch-mod-log', updatedAt: new Date() },
			])
			await refreshAppSettingsCache()

			// 1. Simulate permanent ban
			await eventSubManager.simulate('ban', {
				userId: 'bad-user-id',
				userName: 'baduser',
				userDisplayName: 'BadUser',
				moderatorId: 'mod-id',
				moderatorName: 'goodmod',
				moderatorDisplayName: 'GoodMod',
				reason: 'spamming',
				isPermanent: true,
				endDate: null,
			} as any)

			expect(mockSay).toHaveBeenCalledWith('streamerchannel', 'BadUser was banned!')
			expect(mockSendDiscordMessage).toHaveBeenCalledWith('ch-disc-ban', 'Discord: BadUser banned!', undefined)
			expect(mockSendDiscordMessage).toHaveBeenCalledWith('ch-mod-log', '', expect.objectContaining({
				title: '🔴 User Banned',
				color: 0xEF4444,
				url: 'https://www.twitch.tv/popout/streamerchannel/viewercard/baduser',
			}))

			// 2. Simulate timeout
			vi.clearAllMocks()
			const futureDate = new Date(Date.now() + 600 * 1000)
			await eventSubManager.simulate('ban', {
				userId: 'bad-user-id',
				userName: 'baduser',
				userDisplayName: 'BadUser',
				moderatorId: 'mod-id',
				moderatorName: 'goodmod',
				moderatorDisplayName: 'GoodMod',
				reason: 'offensive speech',
				isPermanent: false,
				endDate: futureDate,
			} as any)

			expect(mockSay).toHaveBeenCalledWith('streamerchannel', expect.stringContaining('BadUser was timed out for'))
			expect(mockSendDiscordMessage).toHaveBeenCalledWith('ch-mod-log', '', expect.objectContaining({
				title: '🟠 User Timed Out',
				color: 0xF59E0B,
			}))
		})
	})
})
