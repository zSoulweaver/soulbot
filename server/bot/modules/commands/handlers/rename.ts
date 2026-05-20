import type { CommandHandler } from '~~/server/bot/core/types'
import type { RenameArgs } from '../schema'
import { eq } from 'drizzle-orm'
import { registry } from '~~/server/bot/core/registry'
import { db } from '~~/server/database'
import { commandAliases, commands } from '~~/server/database/schema'

export const handleRename: CommandHandler<typeof RenameArgs> = async (ctx, [oldTrigger, newTrigger]) => {
	const resolved = registry.resolveTrigger(oldTrigger)
	if (!resolved)
		return ctx.reply('command.rename-not-found', { trigger: oldTrigger })

	// Check if it's an alias
	const [isAlias] = await db.select().from(commandAliases).where(eq(commandAliases.trigger, oldTrigger))
	if (isAlias)
		return ctx.reply('command.rename-is-alias', { trigger: oldTrigger })

	// Check if new trigger is taken
	if (registry.resolveTrigger(newTrigger))
		return ctx.reply('command.rename-taken', { trigger: newTrigger })

	await db.update(commands)
		.set({ trigger: newTrigger })
		.where(eq(commands.id, resolved.commandId))

	await registry.syncWithDb()
	ctx.reply('command.rename-success', { old: oldTrigger, new: newTrigger })
}
