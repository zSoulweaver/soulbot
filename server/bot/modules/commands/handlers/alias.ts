import type { CommandHandler } from '~~/server/bot/core/types'
import type { AliasArgs } from '../schema'
import { eq } from 'drizzle-orm'
import { registry } from '~~/server/bot/core/registry'
import { db } from '~~/server/database'
import { commandAliases, commands } from '~~/server/database/schema'

export const handleAlias: CommandHandler<typeof AliasArgs> = async (ctx, [aliasName, targetTrigger, ...targetArgs]) => {
	// Validate alias name isn't a root command trigger
	const [rootCmd] = await db.select().from(commands).where(eq(commands.trigger, aliasName))
	if (rootCmd)
		return ctx.reply('command.alias-exists', { name: aliasName })

	const resolvedTarget = registry.resolveTrigger(targetTrigger)
	if (!resolvedTarget)
		return ctx.reply('command.alias-target-not-found', { target: targetTrigger })

	const command = registry.getCommand(resolvedTarget.commandId)
	if (!command)
		return ctx.reply('command.alias-underlying-not-found', { target: targetTrigger })

	let finalSubcommand = resolvedTarget.subcommand || undefined
	let finalOverrideArgs = resolvedTarget.overrideArgs || []

	// If the targetTrigger didn't have a subcommand, check if the next word is one
	let argsToProcess = targetArgs
	if (!finalSubcommand && targetArgs.length > 0) {
		const potSub = targetArgs[0]?.toLowerCase()
		if (potSub && command.subcommands?.[potSub]) {
			finalSubcommand = potSub
			argsToProcess = targetArgs.slice(1)
		}
	}

	// Append any new args to existing overrideArgs
	finalOverrideArgs = [...finalOverrideArgs, ...argsToProcess]

	await db.insert(commandAliases)
		.values({
			trigger: aliasName,
			commandId: resolvedTarget.commandId,
			subcommand: finalSubcommand,
			overrideArgs: finalOverrideArgs.length > 0 ? finalOverrideArgs : null,
		})
		.onConflictDoUpdate({
			target: commandAliases.trigger,
			set: {
				commandId: resolvedTarget.commandId,
				subcommand: finalSubcommand,
				overrideArgs: finalOverrideArgs.length > 0 ? finalOverrideArgs : null,
			},
		})

	await registry.syncWithDb()
	const fullTargetString = `${targetTrigger}${finalSubcommand ? ` ${finalSubcommand}` : ''}${finalOverrideArgs.length > 0 ? ` ${finalOverrideArgs.join(' ')}` : ''}`
	ctx.reply('command.alias-success', { name: aliasName, target: fullTargetString })
}
