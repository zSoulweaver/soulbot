import { sql } from 'drizzle-orm'
import { activityTracker } from '~~/server/bot/core/activity-tracker'
import { db } from '~~/server/database'
import { users } from '~~/server/database/schema'
import { defineCommand } from '../../core/define-command'
import { handleWatchTimeRoot } from './handlers/root'
import { TimeArgs } from './schema'
import { registerWatchTimeTemplates } from './templates'

registerWatchTimeTemplates()

// Register tick event handler to track watch time (minutes in stream)
activityTracker.on('tick', async (payload) => {
	const { chatters, isOnline, timestamp } = payload
	if (!isOnline) {
		return // Only track watch time when the stream is online
	}

	if (chatters.length === 0) {
		return
	}

	botLogger.info('[Payout Engine] Executing watch time increment via activity tick')

	const chatterValues = chatters.map(chatter => ({
		id: chatter.id,
		username: chatter.username,
		displayName: chatter.displayName,
		watchTime: 1,
		firstSeen: timestamp,
		lastSeen: timestamp,
	}))

	// Batch upsert watch times
	const chunkSize = 500
	for (let i = 0; i < chatterValues.length; i += chunkSize) {
		const chunk = chatterValues.slice(i, i + chunkSize)
		await db.insert(users)
			.values(chunk)
			.onConflictDoUpdate({
				target: users.id,
				set: {
					watchTime: sql`${users.watchTime} + 1`,
					username: sql`EXCLUDED.username`,
					displayName: sql`EXCLUDED.display_name`,
					lastSeen: timestamp,
					updatedAt: new Date(),
				},
			})
	}

	botLogger.info(
		{ incrementedCount: chatterValues.length },
		'[Payout Engine] Batch increment time to chatters',
	)
})

export const watchtimeModule = defineCommand({
	id: 'time',
	description: 'Check your watch time',
	usage: '!time [user]',
	permission: 'everyone',
	args: TimeArgs,
	handler: handleWatchTimeRoot,
	templates: [
		'watchtime.show',
		'watchtime.show-self',
		'watchtime.user-no-time',
		'watchtime.user-no-time-self',
	],
})
