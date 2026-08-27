import type { CommandHandler } from '~~/server/bot/core/types'
import { cancelVaultRaid, isVaultActive } from '../../vault-manager'

export const handleVaultCancel: CommandHandler = async (ctx) => {
	if (!isVaultActive()) {
		return ctx.reply('points.vault.not-active')
	}

	await cancelVaultRaid(ctx.user.displayName, ctx)
}
