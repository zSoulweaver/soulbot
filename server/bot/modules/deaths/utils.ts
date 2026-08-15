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

export function formatTwitchBoxArtUrl(boxArtUrl: string | null | undefined, width = 285, height = 380): string | null {
	if (!boxArtUrl)
		return null
	return boxArtUrl
		.replace('{width}', width.toString())
		.replace('{height}', height.toString())
		.replace(/-\d+x\d+\./, `-${width}x${height}.`)
}

export async function fetchTwitchGameMetadata(gameName: string): Promise<{ twitchGameId: string | null, boxArtUrl: string | null }> {
	try {
		const api = getApiClient()
		const game = await api.games.getGameByName(gameName)
		if (game) {
			return {
				twitchGameId: game.id,
				boxArtUrl: formatTwitchBoxArtUrl(game.boxArtUrl, 285, 380),
			}
		}
	}
	catch (err) {
		botLogger.error({ err, gameName }, '[Deaths] Failed to fetch Twitch game metadata')
	}
	return { twitchGameId: null, boxArtUrl: null }
}

export async function getOrCreateGameDeathRecord(
	gameName: string,
	metadata?: { twitchGameId?: string | null, boxArtUrl?: string | null },
): Promise<typeof gameDeaths.$inferSelect> {
	const existing = await db.query.gameDeaths.findFirst({
		where: eq(gameDeaths.gameName, gameName),
	})

	if (existing) {
		// If existing record is missing box art metadata and no explicit metadata passed, attempt background fetch
		if (!existing.boxArtUrl && (!metadata || metadata.boxArtUrl === undefined)) {
			const fetched = await fetchTwitchGameMetadata(gameName)
			if (fetched.boxArtUrl || fetched.twitchGameId) {
				const [updated] = await db.update(gameDeaths)
					.set({
						twitchGameId: fetched.twitchGameId,
						boxArtUrl: fetched.boxArtUrl,
						updatedAt: sql`(strftime('%s', 'now'))`,
					})
					.where(eq(gameDeaths.id, existing.id))
					.returning()
				if (updated)
					return updated
			}
		}
		return existing
	}

	let twitchGameId = metadata?.twitchGameId || null
	let boxArtUrl = formatTwitchBoxArtUrl(metadata?.boxArtUrl, 285, 380)

	if (!twitchGameId && !boxArtUrl) {
		const fetched = await fetchTwitchGameMetadata(gameName)
		twitchGameId = fetched.twitchGameId
		boxArtUrl = fetched.boxArtUrl
	}

	const now = new Date()
	return {
		id: 0,
		gameName,
		deaths: 0,
		twitchGameId,
		boxArtUrl,
		createdAt: now,
		updatedAt: now,
	}
}

export async function updateGameDeathCount(
	gameName: string,
	deaths: number,
	metadata?: { twitchGameId?: string | null, boxArtUrl?: string | null },
	id?: number | null,
): Promise<typeof gameDeaths.$inferSelect> {
	const safeDeaths = Math.max(0, Math.floor(deaths))
	const existing = id
		? await db.query.gameDeaths.findFirst({ where: eq(gameDeaths.id, id) })
		: await db.query.gameDeaths.findFirst({ where: eq(gameDeaths.gameName, gameName) })

	let twitchGameId = metadata?.twitchGameId !== undefined ? metadata.twitchGameId : existing?.twitchGameId || null
	const rawBoxArt = metadata?.boxArtUrl !== undefined ? metadata.boxArtUrl : existing?.boxArtUrl || null
	let boxArtUrl = formatTwitchBoxArtUrl(rawBoxArt, 285, 380)

	if (!twitchGameId || !boxArtUrl) {
		const fetched = await fetchTwitchGameMetadata(gameName)
		if (!twitchGameId && fetched.twitchGameId)
			twitchGameId = fetched.twitchGameId
		if (!boxArtUrl && fetched.boxArtUrl)
			boxArtUrl = fetched.boxArtUrl
	}

	let result: typeof gameDeaths.$inferSelect

	if (safeDeaths === 0) {
		if (existing) {
			await db.delete(gameDeaths).where(eq(gameDeaths.id, existing.id))
		}
		const now = new Date()
		result = {
			id: existing?.id || 0,
			gameName,
			deaths: 0,
			twitchGameId,
			boxArtUrl,
			createdAt: existing?.createdAt || now,
			updatedAt: now,
		}
	}
	else if (existing) {
		const [updated] = await db.update(gameDeaths)
			.set({
				gameName,
				deaths: safeDeaths,
				twitchGameId,
				boxArtUrl,
				updatedAt: sql`(strftime('%s', 'now'))`,
			})
			.where(eq(gameDeaths.id, existing.id))
			.returning()

		result = updated || existing
	}
	else {
		const [created] = await db.insert(gameDeaths).values({
			gameName,
			deaths: safeDeaths,
			twitchGameId,
			boxArtUrl,
		}).returning()

		result = created || {
			id: 0,
			gameName,
			deaths: safeDeaths,
			twitchGameId,
			boxArtUrl,
			createdAt: new Date(),
			updatedAt: new Date(),
		}
	}

	botEventBus.emit('deaths:updated', { gameName: result.gameName, deaths: result.deaths })
	clearDeathsCache()
	return result
}

export async function clearDeathsCache(): Promise<void> {
	try {
		const storage = useStorage('cache')
		const keys = await storage.getKeys('nitro:handlers:deaths-leaderboard')
		for (const key of keys) {
			await storage.removeItem(key)
		}
	}
	catch (err) {
		botLogger.error({ err }, '[Deaths] Failed to clear deaths leaderboard cache')
	}
}

export async function syncAllGameDeathsMetadata(): Promise<number> {
	let updatedCount = 0
	try {
		const records = await db.select().from(gameDeaths)
		for (const record of records) {
			const formattedBoxArt = formatTwitchBoxArtUrl(record.boxArtUrl, 285, 380)
			const isBoxArtLowRes = record.boxArtUrl !== formattedBoxArt

			if (!record.boxArtUrl || !record.twitchGameId || isBoxArtLowRes) {
				const fetched = await fetchTwitchGameMetadata(record.gameName)
				const newBoxArt = fetched.boxArtUrl || formattedBoxArt || record.boxArtUrl
				const newGameId = fetched.twitchGameId || record.twitchGameId

				if (newBoxArt !== record.boxArtUrl || newGameId !== record.twitchGameId) {
					await db.update(gameDeaths)
						.set({
							twitchGameId: newGameId,
							boxArtUrl: newBoxArt,
							updatedAt: sql`(strftime('%s', 'now'))`,
						})
						.where(eq(gameDeaths.id, record.id))
					updatedCount++
				}
			}
		}
	}
	catch (err) {
		botLogger.error({ err }, '[Deaths] Error during batch metadata sync')
	}
	return updatedCount
}

export async function cleanupZeroDeathsRecords(): Promise<number> {
	try {
		const deleted = await db.delete(gameDeaths)
			.where(eq(gameDeaths.deaths, 0))
			.returning()
		return deleted.length
	}
	catch (err) {
		botLogger.error({ err }, '[Deaths] Error cleaning up 0-death records')
		return 0
	}
}
