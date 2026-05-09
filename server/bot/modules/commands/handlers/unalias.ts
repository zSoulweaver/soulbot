import { eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { commandAliases } from '~~/server/database/schema'
import type { CommandHandler } from '~~/server/bot/core/types'
import { registry } from '~~/server/bot/core/registry'
import type { UnaliasArgs } from '../schema'

export const handleUnalias: CommandHandler<typeof UnaliasArgs> = async (ctx, [aliasName]) => {
	const [existing] = await db.select().from(commandAliases).where(eq(commandAliases.trigger, aliasName))
	if (!existing)
		return ctx.reply('command.unalias-not-found', { name: aliasName })

	await db.delete(commandAliases).where(eq(commandAliases.trigger, aliasName))
	await registry.syncWithDb()
	ctx.reply('command.unalias-success', { name: aliasName })
}
