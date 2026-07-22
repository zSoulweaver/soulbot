import { db } from '~~/server/database'
import { eventsLog } from '~~/server/database/schema'
import { botLogger } from '~~/server/utils/logger'

export async function logTwitchEvent(
	type: 'follow' | 'subscription' | 'gift' | 'cheer' | 'raid' | 'live' | 'offline' | 'ad_break' | 'ban' | 'timeout' | 'unban' | 'message_delete',
	userName: string,
	displayName: string,
	metadata: {
		tier?: string
		giftCount?: number
		bitsCount?: number
		cheerMessage?: string
		raidSize?: number
		duration?: number
		requester?: string
		moderator?: string
	} = {},
) {
	try {
		await db.insert(eventsLog).values({
			type,
			userName,
			displayName,
			metadata,
			createdAt: new Date(),
		})
	}
	catch (err) {
		botLogger.error({ err, type, userName }, '[Events Log] Failed to log Twitch event to database')
	}
}
