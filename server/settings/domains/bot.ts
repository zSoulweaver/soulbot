import { z } from 'zod'
import { defineSettingsDomain } from '../registry'

export const BotSettingsSchema = z.object({
	botChatMode: z.enum(['normal', 'action']).default('action'),
	botMuted: z.boolean().default(false),
	streamerTokenVersion: z.number().int().default(1),
	botTokenVersion: z.number().int().default(1),
})

export type BotSettings = z.infer<typeof BotSettingsSchema>

export const botSettings = defineSettingsDomain({
	namespace: 'bot',
	schema: BotSettingsSchema,
	customKeys: {
		botChatMode: 'bot.chat_mode',
		botMuted: 'bot.muted',
		streamerTokenVersion: 'twitch.streamer_token_version',
		botTokenVersion: 'twitch.bot_token_version',
	},
})
