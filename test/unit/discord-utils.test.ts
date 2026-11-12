import { ChannelType } from 'discord.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearDatabase } from '../helpers'

vi.unmock('~~/server/utils/discord')

// Import after unmock
const {
	deleteDiscordMessage,
	getDiscordChannels,
	sendDiscordMessage,
	setDiscordClientForTesting,
} = await import('~~/server/utils/discord')
const { updateAppSetting } = await import('~~/server/utils/settings')

describe('Discord Utils - Channel Handling', () => {
	beforeEach(async () => {
		await clearDatabase()
		setDiscordClientForTesting(null)
	})

	describe('getDiscordChannels', () => {
		it('should return empty list when bot is not connected', async () => {
			const channels = await getDiscordChannels()
			expect(channels).toEqual([])
		})

		it('should return both GuildText and GuildAnnouncement channels, filtering out other types', async () => {
			await updateAppSetting('discord.guild_id', 'guild-123')

			const mockChannelsMap = new Map([
				['ch-1', { id: 'ch-1', name: 'general', type: ChannelType.GuildText }],
				['ch-2', { id: 'ch-2', name: 'stream-alerts', type: ChannelType.GuildAnnouncement }],
				['ch-3', { id: 'ch-3', name: 'voice-chat', type: ChannelType.GuildVoice }],
				['ch-4', { id: 'ch-4', name: 'Category', type: ChannelType.GuildCategory }],
			])

			const mockClient = {
				isReady: () => true,
				guilds: {
					fetch: vi.fn(async (id: string) => {
						if (id === 'guild-123') {
							return {
								channels: {
									fetch: vi.fn(async () => mockChannelsMap),
								},
							}
						}
						return null
					}),
				},
			}

			setDiscordClientForTesting(mockClient)

			const channels = await getDiscordChannels()
			expect(channels).toHaveLength(2)
			expect(channels).toEqual([
				{ id: 'ch-1', name: 'general', isAnnouncement: false },
				{ id: 'ch-2', name: 'stream-alerts', isAnnouncement: true },
			])
		})
	})

	describe('sendDiscordMessage', () => {
		it('should send a message to a GuildAnnouncement channel successfully', async () => {
			await updateAppSetting('discord.enabled', 'true')

			const mockSend = vi.fn(async (_options: any) => ({
				id: 'msg-announcement-1',
				channelId: 'ch-announcement',
			}))

			const mockClient = {
				isReady: () => true,
				channels: {
					fetch: vi.fn(async (channelId: string) => {
						if (channelId === 'ch-announcement') {
							return {
								id: 'ch-announcement',
								type: ChannelType.GuildAnnouncement,
								send: mockSend,
							}
						}
						return null
					}),
				},
			}

			setDiscordClientForTesting(mockClient)

			const result = await sendDiscordMessage('ch-announcement', 'Streamer is now live!')
			expect(result).toEqual({ id: 'msg-announcement-1', channelId: 'ch-announcement' })
			expect(mockSend).toHaveBeenCalledWith({ content: 'Streamer is now live!' })
		})

		it('should reject sending to non-text or non-announcement channels', async () => {
			await updateAppSetting('discord.enabled', 'true')

			const mockClient = {
				isReady: () => true,
				channels: {
					fetch: vi.fn(async (channelId: string) => {
						if (channelId === 'ch-voice') {
							return {
								id: 'ch-voice',
								type: ChannelType.GuildVoice,
							}
						}
						return null
					}),
				},
			}

			setDiscordClientForTesting(mockClient)

			const result = await sendDiscordMessage('ch-voice', 'Hello!')
			expect(result).toBeNull()
		})
	})

	describe('deleteDiscordMessage', () => {
		it('should delete a message in a GuildAnnouncement channel', async () => {
			const mockDelete = vi.fn(async () => {})
			const mockClient = {
				isReady: () => true,
				channels: {
					fetch: vi.fn(async (channelId: string) => {
						if (channelId === 'ch-announcement') {
							return {
								id: 'ch-announcement',
								type: ChannelType.GuildAnnouncement,
								messages: {
									fetch: vi.fn(async (msgId: string) => {
										if (msgId === 'msg-123') {
											return { delete: mockDelete }
										}
										return null
									}),
								},
							}
						}
						return null
					}),
				},
			}

			setDiscordClientForTesting(mockClient)

			const result = await deleteDiscordMessage('ch-announcement', 'msg-123')
			expect(result).toBe(true)
			expect(mockDelete).toHaveBeenCalled()
		})
	})
})
