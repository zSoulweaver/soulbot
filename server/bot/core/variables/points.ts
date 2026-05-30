import { eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { users } from '~~/server/database/schema'
import { defineCommandVariable } from '../define-command-variable'

/**
 * Points variable resolver: $(user.points), $(points)
 */
export const pointsVariable = defineCommandVariable({
	name: 'points',
	aliases: ['user.points'],
	description: 'Retrieves the points balance of the user triggering the command.',
	examples: [
		{ syntax: '$(points)', description: 'Queries the sender\'s points balance.' },
	],
	resolve: async (_args, ctx, cache) => {
		if (cache.points !== undefined) {
			return String(cache.points)
		}

		const [dbUser] = await db.select().from(users).where(eq(users.id, ctx.user.id))
		const pts = dbUser?.points ?? 0

		cache.points = pts
		return String(pts)
	},
})
