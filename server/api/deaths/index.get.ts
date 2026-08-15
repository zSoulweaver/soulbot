import { and, count, desc, gt, like, sql } from 'drizzle-orm'
import { getCurrentGameName } from '~~/server/bot/modules/deaths/utils'
import { db } from '~~/server/database'
import { gameDeaths } from '~~/server/database/schema'
import { buildPaginationMeta, parsePaginationParams } from '~~/server/utils/pagination'
import { getApiClient, getStreamerToken } from '~~/server/utils/twurple'

export default defineCachedEventHandler(async (event) => {
	const { page, limit, search } = parsePaginationParams(event)

	// 1. Fetch current game name and stream live status
	const currentGame = await getCurrentGameName()
	let isLive = false

	try {
		const streamerToken = await getStreamerToken()
		if (streamerToken?.userId) {
			const api = getApiClient()
			const stream = await api.streams.getStreamByUserId(streamerToken.userId)
			if (stream) {
				isLive = true
			}
		}
	}
	catch {
		// Ignore API errors for public endpoint
	}

	// 2. Identify featured game matching current stream category across ALL tracked deaths (> 0 deaths)
	const [featuredRecord] = await db
		.select()
		.from(gameDeaths)
		.where(and(gt(gameDeaths.deaths, 0), sql`LOWER(${gameDeaths.gameName}) = LOWER(${currentGame})`))

	let featuredGame = null
	if (featuredRecord) {
		const updatedAtTs = featuredRecord.updatedAt instanceof Date
			? Math.floor(featuredRecord.updatedAt.getTime() / 1000)
			: Number(featuredRecord.updatedAt) || 0

		const [rankResult] = await db
			.select({
				rank: sql<number>`COUNT(*) + 1`,
			})
			.from(gameDeaths)
			.where(
				and(
					gt(gameDeaths.deaths, 0),
					sql`(${gameDeaths.deaths} > ${featuredRecord.deaths} OR (${gameDeaths.deaths} = ${featuredRecord.deaths} AND ${gameDeaths.updatedAt} > ${updatedAtTs}))`,
				),
			)

		featuredGame = {
			...featuredRecord,
			rank: Number(rankResult?.rank || 1),
			isCurrentGame: true,
		}
	}

	// 3. Build search condition for paginated list (deaths > 0 AND search filter if provided)
	const searchCondition = search
		? and(gt(gameDeaths.deaths, 0), like(sql`LOWER(${gameDeaths.gameName})`, `%${search.toLowerCase()}%`))
		: gt(gameDeaths.deaths, 0)

	const totalCountResult = await db
		.select({ totalCount: count() })
		.from(gameDeaths)
		.where(searchCondition)
	const totalCount = totalCountResult[0]?.totalCount || 0

	// 4. Fetch paged rows
	const pagedRows = await db
		.select()
		.from(gameDeaths)
		.where(searchCondition)
		.orderBy(desc(gameDeaths.deaths), desc(gameDeaths.updatedAt))
		.limit(limit)
		.offset((page - 1) * limit)

	const data = pagedRows.map((item, index) => {
		const rank = (page - 1) * limit + index + 1
		return {
			...item,
			rank,
			isCurrentGame: item.gameName.toLowerCase() === currentGame.toLowerCase(),
		}
	})

	return {
		currentGame,
		isLive,
		featuredGame,
		data,
		meta: buildPaginationMeta(totalCount, page, limit),
	}
}, {
	maxAge: 30,
	swr: false,
	name: 'deaths-leaderboard',
	getKey: (event) => {
		const query = getQuery(event)
		const page = query.page || 1
		const limit = query.limit || 10
		const search = (query.search || '').toString().trim().toLowerCase()
		return `${page}-${limit}-${search}`
	},
})
