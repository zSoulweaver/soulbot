import type { CommandHandler } from '~~/server/bot/core/types'
import type { VaultStartArgs } from '../../schema'
import { isVaultActive, startVaultRaid } from '../../vault-manager'

export const handleVaultStart: CommandHandler<typeof VaultStartArgs> = async (ctx, [duration]) => {
	if (isVaultActive()) {
		return ctx.reply('points.vault.already-active')
	}

	await startVaultRaid(duration, ctx)
}
