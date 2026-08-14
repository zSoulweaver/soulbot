import { eq } from 'drizzle-orm'
import { handleCommand } from '~~/server/bot/core/command-dispatcher'
import { eventSubManager } from '~~/server/bot/core/eventsub'
import { cleanUsername } from '~~/server/bot/core/utils'
import { db } from '~~/server/database'
import { users } from '~~/server/database/schema'
import { updateUserRoleCache } from '~~/server/utils/auth'
import { botLogger } from '~~/server/utils/logger'
import { getStreamerChannelName, getTwitchUserRole } from '~~/server/utils/twurple'

export function registerTwitchEventSubHandlers() {
	eventSubManager.events.on('user.whisper.message', async (event) => {
		try {
			const message = event.messageText.trim()
			if (!message.startsWith('!'))
				return

			const channel = await getStreamerChannelName()
			if (!channel) {
				botLogger.warn('[EventSub Twitch] No streamer channel configured; dropping whisper command')
				return
			}

			// Look up user roles on the broadcaster channel
			const roleInfo = await getTwitchUserRole(event.senderUserId)

			const mockRaw: any = {
				id: event.id,
				isWhisper: true,
				userInfo: {
					userId: event.senderUserId,
					userName: event.senderUserName,
					displayName: event.senderUserDisplayName,
					isBroadcaster: roleInfo.role === 'caster',
					isMod: roleInfo.role === 'moderator',
					isVip: roleInfo.isVip,
					isSubscriber: roleInfo.isSubscriber,
				},
			}

			await handleCommand(channel, event.senderUserName, message, mockRaw, { isWhisper: true })
		}
		catch (err) {
			botLogger.error({ err, fromUser: event.senderUserName }, '[EventSub Twitch] Failed to handle user.whisper.message')
		}
	})

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
