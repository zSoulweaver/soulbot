import { db } from '~~/server/database'
import { twitchTokens } from '~~/server/database/schema'
import { isBotRunning } from '~~/server/utils/twurple'

export default defineEventHandler(async () => {
	const tokens = await db.select().from(twitchTokens)

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
		isBotRunning: isBotRunning(),
	}
})
