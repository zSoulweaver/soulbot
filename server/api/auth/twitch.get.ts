import { db } from '~~/server/database'
import { users } from '~~/server/database/schema'
import { getTwitchUserRole } from '~~/server/utils/twurple'

export default defineOAuthTwitchEventHandler({
	config: {
		scope: ['user:read:email'],
		redirectURL: 'http://localhost:3000/api/auth/twitch',
	},
	async onSuccess(event, { user: twitchUser }) {
		const now = new Date()

		// 1. Calculate Role
		const roleInfo = await getTwitchUserRole(twitchUser.id)

		// 2. Upsert User in DB
		const results = await db.insert(users)
			.values({
				id: twitchUser.id,
				username: twitchUser.login,
				displayName: twitchUser.display_name,
				image: twitchUser.profile_image_url,
				role: roleInfo.role,
				isVip: roleInfo.isVip,
				isSubscriber: roleInfo.isSubscriber,
				createdAt: now,
				updatedAt: now,
			})
			.onConflictDoUpdate({
				target: users.id,
				set: {
					username: twitchUser.login,
					displayName: twitchUser.display_name,
					image: twitchUser.profile_image_url,
					role: roleInfo.role,
					isVip: roleInfo.isVip,
					isSubscriber: roleInfo.isSubscriber,
					updatedAt: now,
				},
			})
			.returning()

		const dbUser = results[0]
		if (!dbUser) {
			throw createError({
				statusCode: 500,
				statusMessage: 'Failed to sync user with database',
			})
		}

		// 3. Set Session
		await setUserSession(event, {
			user: {
				id: dbUser.id,
				username: dbUser.username,
				displayName: dbUser.displayName,
				image: dbUser.image,
				role: dbUser.role,
				isVip: dbUser.isVip,
				isSubscriber: dbUser.isSubscriber,
			},
			loggedInAt: now.toISOString(),
		})

		return sendRedirect(event, '/')
	},
	onError(event, error) {
		console.error('[Twitch Auth Error]', error)
		return sendRedirect(event, '/login?error=auth_failed')
	},
})
