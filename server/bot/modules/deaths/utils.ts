import { eq, sql } from 'drizzle-orm'
import { botEventBus } from '~~/server/bot/core/events'
import { db } from '~~/server/database'
import { gameDeaths } from '~~/server/database/schema'
import { botLogger } from '~~/server/utils/logger'
import { getApiClient, getStreamerToken } from '~~/server/utils/twurple'

export async function getCurrentGameName(): Promise<string> {
	try {
		const streamerToken = await getStreamerToken()
		if (streamerToken && streamerToken.userId) {
			const api = getApiClient()
			const stream = await api.streams.getStreamByUserId(streamerToken.userId)
			if (stream && stream.gameName && stream.gameName.trim()) {
				return stream.gameName.trim()
			}

			const channelInfo = await api.channels.getChannelInfoById(streamerToken.userId)
			if (channelInfo && channelInfo.gameName && channelInfo.gameName.trim()) {
				return channelInfo.gameName.trim()
			}
		}
	}
	catch (err) {
		botLogger.error({ err }, '[Deaths] Failed to query current Twitch game category')
	}

	return 'General'
}

export async function getOrCreateGameDeathRecord(gameName: string): Promise<typeof gameDeaths.$inferSelect> {
	const existing = await db.query.gameDeaths.findFirst({
		where: eq(gameDeaths.gameName, gameName),
	})

	if (existing) {
		return existing
	}

	const [created] = await db.insert(gameDeaths).values({
		gameName,
		deaths: 0,
	}).returning()

	if (!created) {
		throw new Error(`Failed to create game death record for ${gameName}`)
	}

	return created
}

export async function updateGameDeathCount(gameName: string, deaths: number): Promise<typeof gameDeaths.$inferSelect> {
	const safeDeaths = Math.max(0, Math.floor(deaths))
	const record = await getOrCreateGameDeathRecord(gameName)

	const [updated] = await db.update(gameDeaths)
		.set({
			deaths: safeDeaths,
			updatedAt: sql`(strftime('%s', 'now'))`,
		})
		.where(eq(gameDeaths.id, record.id))
		.returning()

	const result = updated || record
	botEventBus.emit('deaths:updated', { gameName: result.gameName, deaths: result.deaths })
	return result
}
