import { eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { commands, commandAliases } from '~~/server/database/schema'
import type { CommandHandler } from '~~/server/bot/core/types'
import { registry } from '~~/server/bot/core/registry'
import type { RenameArgs } from '../schema'

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
