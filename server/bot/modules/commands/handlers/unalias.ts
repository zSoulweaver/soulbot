import type { CommandHandler } from '~~/server/bot/core/types'
import type { UnaliasArgs } from '../schema'
import { eq } from 'drizzle-orm'
import { registry } from '~~/server/bot/core/registry'
import { db } from '~~/server/database'
import { commandAliases } from '~~/server/database/schema'

export const handleUnalias: CommandHandler<typeof UnaliasArgs> = async (ctx, [aliasName]) => {
	const [existing] = await db.select().from(commandAliases).where(eq(commandAliases.trigger, aliasName))
	if (!existing)
		return ctx.reply('command.unalias-not-found', { name: aliasName })

	await db.delete(commandAliases).where(eq(commandAliases.trigger, aliasName))
	await registry.syncWithDb()
	ctx.reply('command.unalias-success', { name: aliasName })
}
