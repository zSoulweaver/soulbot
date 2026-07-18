import { eq } from 'drizzle-orm'
import { eventSubManager } from '~~/server/bot/core/eventsub'
import { cleanUsername } from '~~/server/bot/core/utils'
import { db } from '~~/server/database'
import { users } from '~~/server/database/schema'
import { updateUserRoleCache } from '~~/server/utils/auth'
import { botLogger } from '~~/server/utils/logger'

export function registerTwitchEventSubHandlers() {
	eventSubManager.events.on('moderator.add', async (event) => {
		try {
			const now = new Date()
			const username = cleanUsername(event.userName)

			// Update role to 'moderator' in database if they are currently 'viewer'
			// Note: We do not overwrite 'admin' or 'caster' role with 'moderator'
			const [dbUser] = await db.select({ role: users.role }).from(users).where(eq(users.id, event.userId))

			if (!dbUser) {
				await db.insert(users).values({
					id: event.userId,
					username,
					displayName: event.userDisplayName,
					role: 'moderator',
					createdAt: now,
					updatedAt: now,
				})
				updateUserRoleCache(event.userId, 'moderator')
				botLogger.info({ userId: event.userId, username }, '[EventSub Twitch] Added new moderator to database')
			}
			else if (dbUser.role === 'viewer') {
				await db.update(users)
					.set({
						role: 'moderator',
						updatedAt: now,
					})
					.where(eq(users.id, event.userId))
				updateUserRoleCache(event.userId, 'moderator')
				botLogger.info({ userId: event.userId, username }, '[EventSub Twitch] Promoted user to moderator')
			}
		}
		catch (err) {
			botLogger.error({ err, userId: event.userId }, '[EventSub Twitch] Failed to handle moderator.add')
		}
	})

	eventSubManager.events.on('moderator.remove', async (event) => {
		try {
			const now = new Date()
			const username = cleanUsername(event.userName)

			// If the user in DB has 'admin' or 'moderator' role, demote them to 'viewer'
			const [dbUser] = await db.select({ role: users.role }).from(users).where(eq(users.id, event.userId))

			if (dbUser && (dbUser.role === 'admin' || dbUser.role === 'moderator')) {
				await db.update(users)
					.set({
						role: 'viewer',
						updatedAt: now,
					})
					.where(eq(users.id, event.userId))
				updateUserRoleCache(event.userId, 'viewer')
				botLogger.info({ userId: event.userId, username }, '[EventSub Twitch] Demoted unmodded user to viewer')
			}
		}
		catch (err) {
			botLogger.error({ err, userId: event.userId }, '[EventSub Twitch] Failed to handle moderator.remove')
		}
	})
}
