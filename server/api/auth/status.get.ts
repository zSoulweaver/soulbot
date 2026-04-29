import { db } from '../../database'
import { twitchTokens } from '../../database/schema'
import { getChatClient } from '../../utils/twurple'

export default defineEventHandler(async () => {
	const tokens = await db.select().from(twitchTokens)
	const chatClient = await getChatClient()
	const isBotRunning = chatClient?.isConnected || false

	const botToken = tokens.find(t => t.accountType === 'bot')
	const streamerToken = tokens.find(t => t.accountType === 'streamer')

	return {
		bot: botToken
			? {
					userId: botToken.userId,
					userName: botToken.userName,
					displayName: botToken.displayName,
				}
			: null,
		streamer: streamerToken
			? {
					userId: streamerToken.userId,
					userName: streamerToken.userName,
					displayName: streamerToken.displayName,
				}
			: null,
		isBotRunning,
	}
})
