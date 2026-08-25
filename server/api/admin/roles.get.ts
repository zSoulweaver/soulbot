import { eq, inArray } from 'drizzle-orm'
import { db } from '~~/server/database'
import { users } from '~~/server/database/schema'
import { requireStrictCaster } from '~~/server/utils/auth'
import { getApiClient, getStreamerToken, syncModeratorRoles } from '~~/server/utils/twurple'

export default defineEventHandler(async (event) => {
	await requireStrictCaster(event)

	const streamerToken = await getStreamerToken()
	if (!streamerToken || !streamerToken.userId) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Broadcaster Twitch account is not configured.',
		})
	}

	const twitchMods: { userId: string, userName: string, userDisplayName: string }[] = []
	try {
		const api = getApiClient()
		await api.asUser(streamerToken.userId, async (ctx) => {
			const paginator = ctx.moderation.getModeratorsPaginated(streamerToken.userId!)
			let page = await paginator.getNext()
			while (page.length > 0) {
				for (const mod of page) {
					twitchMods.push({
						userId: mod.userId,
						userName: mod.userName,
						userDisplayName: mod.userDisplayName,
					})
				}
				page = await paginator.getNext()
			}
		})
	}
	catch (err) {
		console.error('[roles.get] Failed to fetch moderators from Twitch API:', err)
	}

	const modIds = twitchMods.map(m => m.userId)

	// Sync unmodded users in the background/database
	await syncModeratorRoles(modIds)

	// Fetch all database users with 'admin' role
	const dbAdmins = await db
		.select()
		.from(users)
		.where(eq(users.role, 'admin'))

	// Also fetch database users that correspond to the Twitch moderators
	const dbMods = modIds.length > 0
		? await db.select().from(users).where(inArray(users.id, modIds))
		: []

	// Map user details from database
	const dbUserMap = new Map<string, typeof users.$inferSelect>()
	for (const u of [...dbAdmins, ...dbMods]) {
		dbUserMap.set(u.id, u)
	}

	const results = twitchMods.map((mod) => {
		const dbUser = dbUserMap.get(mod.userId)
		return {
			id: mod.userId,
			username: mod.userName,
			displayName: mod.userDisplayName,
			image: dbUser?.image || null,
			role: dbUser?.role || 'moderator',
			isAdmin: dbUser?.role === 'admin',
		}
	})

	return results
})
