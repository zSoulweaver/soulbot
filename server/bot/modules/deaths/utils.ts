import { eq, sql } from 'drizzle-orm'
import { botEventBus } from '~~/server/bot/core/events'
import { db } from '~~/server/database'
import { gameDeathCounters, games } from '~~/server/database/schema'
import { botLogger } from '~~/server/utils/logger'
import { getApiClient, getStreamerToken } from '~~/server/utils/twurple'

export type GameRecord = typeof games.$inferSelect
export type GameDeathCounterRecord = typeof gameDeathCounters.$inferSelect

export interface GameWithCounters {
	game: GameRecord
	activeCounter: GameDeathCounterRecord
	counters: GameDeathCounterRecord[]
	totalDeaths: number
}

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

/**
 * Retrieves or initializes a game record and its counters.
 * Ensures the game exists and has at least one "Default" counter and a valid activeDeathCounterId.
 */
export async function getOrCreateGame(
	gameName: string,
	metadata?: { twitchGameId?: string | null, boxArtUrl?: string | null },
): Promise<GameWithCounters> {
	const foundGame = await db.query.games.findFirst({
		where: eq(games.name, gameName),
	})

	let game: GameRecord

	if (!foundGame) {
		let twitchGameId = metadata?.twitchGameId || null
		let boxArtUrl = formatTwitchBoxArtUrl(metadata?.boxArtUrl, 285, 380)

		if (!twitchGameId && !boxArtUrl) {
			const fetched = await fetchTwitchGameMetadata(gameName)
			twitchGameId = fetched.twitchGameId
			boxArtUrl = fetched.boxArtUrl
		}

		const [createdGame] = await db.insert(games).values({
			name: gameName,
			twitchGameId,
			boxArtUrl,
		}).returning()

		if (!createdGame) {
			throw new Error(`Failed to create game for ${gameName}`)
		}
		game = createdGame
	}
	else {
		game = foundGame
		if (!game.boxArtUrl && (!metadata || metadata.boxArtUrl === undefined)) {
			const fetched = await fetchTwitchGameMetadata(gameName)
			if (fetched.boxArtUrl || fetched.twitchGameId) {
				const [updated] = await db.update(games)
					.set({
						twitchGameId: fetched.twitchGameId,
						boxArtUrl: fetched.boxArtUrl,
						updatedAt: sql`(strftime('%s', 'now'))`,
					})
					.where(eq(games.id, game.id))
					.returning()
				if (updated)
					game = updated
			}
		}
	}

	// Fetch counters
	let counters = await db.select().from(gameDeathCounters).where(eq(gameDeathCounters.gameId, game.id))

	if (counters.length === 0) {
		const [defaultCounter] = await db.insert(gameDeathCounters).values({
			gameId: game.id,
			name: 'Default',
			deaths: 0,
		}).returning()

		if (!defaultCounter) {
			throw new Error(`Failed to create default counter for game ${game.id}`)
		}

		counters = [defaultCounter]
		const [updatedGame] = await db.update(games)
			.set({
				activeDeathCounterId: defaultCounter.id,
				updatedAt: sql`(strftime('%s', 'now'))`,
			})
			.where(eq(games.id, game.id))
			.returning()

		if (updatedGame)
			game = updatedGame
	}

	let activeCounter = counters.find(c => c.id === game.activeDeathCounterId)
	if (!activeCounter) {
		activeCounter = counters[0]!
		const [updatedGame] = await db.update(games)
			.set({
				activeDeathCounterId: activeCounter.id,
				updatedAt: sql`(strftime('%s', 'now'))`,
			})
			.where(eq(games.id, game.id))
			.returning()
		if (updatedGame)
			game = updatedGame
	}

	const totalDeaths = counters.reduce((sum, c) => sum + c.deaths, 0)

	return {
		game,
		activeCounter,
		counters,
		totalDeaths,
	}
}

/**
 * Updates death count for a specific or active counter within a game.
 */
export async function updateGameDeathCount(
	gameName: string,
	deaths: number,
	options?: {
		counterName?: string
		counterId?: number
		metadata?: { twitchGameId?: string | null, boxArtUrl?: string | null }
	},
): Promise<{ game: GameRecord, targetCounter: GameDeathCounterRecord, totalDeaths: number, isNewCounter: boolean }> {
	const gameData = await getOrCreateGame(gameName, options?.metadata)
	const safeDeaths = Math.max(0, Math.floor(deaths))

	let targetCounter: GameDeathCounterRecord | undefined
	let isNewCounter = false

	if (options?.counterId) {
		targetCounter = gameData.counters.find(c => c.id === options.counterId)
	}
	else if (options?.counterName) {
		const searchName = options.counterName.trim().toLowerCase()
		targetCounter = gameData.counters.find(c => c.name.toLowerCase() === searchName)

		if (!targetCounter) {
			const [created] = await db.insert(gameDeathCounters).values({
				gameId: gameData.game.id,
				name: options.counterName.trim(),
				deaths: safeDeaths,
			}).returning()

			targetCounter = created
			isNewCounter = true
		}
	}
	else {
		targetCounter = gameData.activeCounter
	}

	if (!isNewCounter && targetCounter) {
		const [updated] = await db.update(gameDeathCounters)
			.set({
				deaths: safeDeaths,
				updatedAt: sql`(strftime('%s', 'now'))`,
			})
			.where(eq(gameDeathCounters.id, targetCounter.id))
			.returning()

		if (updated)
			targetCounter = updated
	}

	await db.update(games)
		.set({ updatedAt: sql`(strftime('%s', 'now'))` })
		.where(eq(games.id, gameData.game.id))

	const allCounters = await db.select().from(gameDeathCounters).where(eq(gameDeathCounters.gameId, gameData.game.id))
	const totalDeaths = allCounters.reduce((sum, c) => sum + c.deaths, 0)

	botEventBus.emit('deaths:updated', {
		gameName: gameData.game.name,
		counterName: targetCounter!.name,
		deaths: targetCounter!.deaths,
		totalDeaths,
	})

	clearDeathsCache()

	return {
		game: gameData.game,
		targetCounter: targetCounter!,
		totalDeaths,
		isNewCounter,
	}
}

/**
 * Sets the active death counter for a game. Auto-creates counter if it doesn't exist.
 */
export async function setActiveDeathCounter(
	gameName: string,
	counterName: string,
): Promise<{ game: GameRecord, activeCounter: GameDeathCounterRecord, totalDeaths: number, isCreated: boolean }> {
	const gameData = await getOrCreateGame(gameName)
	const searchName = counterName.trim().toLowerCase()
	let target = gameData.counters.find(c => c.name.toLowerCase() === searchName)
	let isCreated = false

	if (!target) {
		const [created] = await db.insert(gameDeathCounters).values({
			gameId: gameData.game.id,
			name: counterName.trim(),
			deaths: 0,
		}).returning()
		target = created!
		isCreated = true
	}

	const [updatedGame] = await db.update(games)
		.set({
			activeDeathCounterId: target.id,
			updatedAt: sql`(strftime('%s', 'now'))`,
		})
		.where(eq(games.id, gameData.game.id))
		.returning()

	const allCounters = await db.select().from(gameDeathCounters).where(eq(gameDeathCounters.gameId, gameData.game.id))
	const totalDeaths = allCounters.reduce((sum, c) => sum + c.deaths, 0)

	botEventBus.emit('deaths:updated', {
		gameName: gameData.game.name,
		counterName: target.name,
		deaths: target.deaths,
		totalDeaths,
	})

	clearDeathsCache()

	return {
		game: updatedGame || gameData.game,
		activeCounter: target,
		totalDeaths,
		isCreated,
	}
}

/**
 * Renames a counter for a game.
 */
export async function renameDeathCounter(
	gameName: string,
	oldName: string,
	newName: string,
): Promise<{ success: boolean, game: GameRecord, counter?: GameDeathCounterRecord }> {
	const gameData = await getOrCreateGame(gameName)
	const searchOld = oldName.trim().toLowerCase()
	const target = gameData.counters.find(c => c.name.toLowerCase() === searchOld)

	if (!target) {
		return { success: false, game: gameData.game }
	}

	const [updated] = await db.update(gameDeathCounters)
		.set({
			name: newName.trim(),
			updatedAt: sql`(strftime('%s', 'now'))`,
		})
		.where(eq(gameDeathCounters.id, target.id))
		.returning()

	clearDeathsCache()
	return { success: true, game: gameData.game, counter: updated }
}

export async function saveGameWithCounters(
	gameName: string,
	countersData: Array<{ id?: number, name: string, deaths: number, isActive?: boolean }>,
	metadata?: { twitchGameId?: string | null, boxArtUrl?: string | null },
): Promise<{ game: GameRecord, activeCounter: GameDeathCounterRecord, counters: GameDeathCounterRecord[], totalDeaths: number }> {
	const gameData = await getOrCreateGame(gameName, metadata)
	const gameId = gameData.game.id

	const existingCounters = await db.select().from(gameDeathCounters).where(eq(gameDeathCounters.gameId, gameId))
	const providedIds = new Set(countersData.filter(c => c.id).map(c => c.id!))

	const toDelete = existingCounters.filter(c => !providedIds.has(c.id))
	for (const d of toDelete) {
		await db.delete(gameDeathCounters).where(eq(gameDeathCounters.id, d.id))
	}

	let activeCounterId: number | null = null

	if (countersData.length === 0) {
		const [created] = await db.insert(gameDeathCounters).values({
			gameId,
			name: 'Default',
			deaths: 0,
		}).returning()
		activeCounterId = created?.id || null
	}
	else {
		for (const item of countersData) {
			const name = item.name.trim() || 'Default'
			const deaths = Math.max(0, Math.floor(Number(item.deaths) || 0))

			if (item.id && existingCounters.some(c => c.id === item.id)) {
				const [updated] = await db.update(gameDeathCounters)
					.set({
						name,
						deaths,
						updatedAt: sql`(strftime('%s', 'now'))`,
					})
					.where(eq(gameDeathCounters.id, item.id))
					.returning()
				if (item.isActive && updated) {
					activeCounterId = updated.id
				}
			}
			else {
				const [created] = await db.insert(gameDeathCounters).values({
					gameId,
					name,
					deaths,
				}).returning()
				if (item.isActive && created) {
					activeCounterId = created.id
				}
			}
		}
	}

	let finalCounters = await db.select().from(gameDeathCounters).where(eq(gameDeathCounters.gameId, gameId))
	if (finalCounters.length === 0) {
		const [created] = await db.insert(gameDeathCounters).values({
			gameId,
			name: 'Default',
			deaths: 0,
		}).returning()
		if (created) {
			finalCounters = [created]
			activeCounterId = created.id
		}
	}

	if (!activeCounterId || !finalCounters.some(c => c.id === activeCounterId)) {
		activeCounterId = finalCounters[0]?.id || null
	}

	const twitchGameId = metadata?.twitchGameId !== undefined ? metadata.twitchGameId : gameData.game.twitchGameId
	const boxArtUrl = metadata?.boxArtUrl !== undefined ? formatTwitchBoxArtUrl(metadata.boxArtUrl, 285, 380) : gameData.game.boxArtUrl

	const [updatedGame] = await db.update(games)
		.set({
			twitchGameId,
			boxArtUrl,
			activeDeathCounterId: activeCounterId,
			updatedAt: sql`(strftime('%s', 'now'))`,
		})
		.where(eq(games.id, gameId))
		.returning()

	const totalDeaths = finalCounters.reduce((sum, c) => sum + c.deaths, 0)
	const activeCounter = finalCounters.find(c => c.id === activeCounterId) || finalCounters[0]!

	botEventBus.emit('deaths:updated', {
		gameName: updatedGame ? updatedGame.name : gameData.game.name,
		counterName: activeCounter.name,
		deaths: activeCounter.deaths,
		totalDeaths,
	})

	clearDeathsCache()

	return {
		game: updatedGame || gameData.game,
		activeCounter,
		counters: finalCounters,
		totalDeaths,
	}
}

export async function clearDeathsCache(): Promise<void> {
	try {
		const storage = useStorage('cache')
		const leaderboardKeys = await storage.getKeys('nitro:handlers:deaths-leaderboard')
		for (const key of leaderboardKeys) {
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
		const allGames = await db.select().from(games)
		for (const game of allGames) {
			const formattedBoxArt = formatTwitchBoxArtUrl(game.boxArtUrl, 285, 380)
			const isBoxArtLowRes = game.boxArtUrl !== formattedBoxArt

			if (!game.boxArtUrl || !game.twitchGameId || isBoxArtLowRes) {
				const fetched = await fetchTwitchGameMetadata(game.name)
				const newBoxArt = fetched.boxArtUrl || formattedBoxArt || game.boxArtUrl
				const newGameId = fetched.twitchGameId || game.twitchGameId

				if (newBoxArt !== game.boxArtUrl || newGameId !== game.twitchGameId) {
					await db.update(games)
						.set({
							twitchGameId: newGameId,
							boxArtUrl: newBoxArt,
							updatedAt: sql`(strftime('%s', 'now'))`,
						})
						.where(eq(games.id, game.id))
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
