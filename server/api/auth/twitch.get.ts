import { sql } from 'drizzle-orm'
import { db } from '~~/server/database'
import { users } from '~~/server/database/schema'
import { getTwitchUserRole } from '~~/server/utils/twurple'

export default defineOAuthTwitchEventHandler({
	config: {
		clientId: useRuntimeConfig().twitchClientId,
		clientSecret: useRuntimeConfig().twitchClientSecret,
		scope: ['user:read:email'],
		redirectURL: useRuntimeConfig().twitchRedirectUri,
	},
	async onSuccess(event, { user: twitchUser }) {
		const now = new Date()

		const roleInfo = await getTwitchUserRole(twitchUser.id)

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
					role: sql`CASE WHEN ${users.role} = 'admin' AND ${roleInfo.role} = 'moderator' THEN 'admin' ELSE ${roleInfo.role} END`,
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
		return sendRedirect(event, '/?error=auth_failed')
	},
})
