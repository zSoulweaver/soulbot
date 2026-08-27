import { defineCommand } from '../../core/define-command'
import { handleVaultCancel } from './handlers/vault/cancel'
import { handleVaultRoot } from './handlers/vault/root'
import { handleVaultStart } from './handlers/vault/start'
import { VaultArgs, VaultStartArgs } from './schema'

export const vaultModule = defineCommand({
	id: 'vault',
	description: 'Participate in a communal group Vault Raid',
	usage: '!vault <amount|all|half|0>',
	permission: 'everyone',
	args: VaultArgs,
	templates: [
		'points.vault.joined',
		'points.vault.updated',
		'points.vault.opt-out',
		'points.vault.not-joined',
		'points.vault.not-active',
		'points.vault.already-active',
		'points.vault.cancelled',
		'points.vault.min-bet',
		'points.vault.max-bet',
		'points.vault.not-enough-points',
		'points.vault.invalid-amount',
		'points.user-no-points-self',
	],
	handler: handleVaultRoot,
	subcommands: {
		start: {
			description: 'Start a communal Vault Raid',
			usage: '!vault start [duration]',
			permission: 'moderator',
			args: VaultStartArgs,
			handler: handleVaultStart,
			templates: [
				'points.vault.already-active',
			],
		},
		cancel: {
			description: 'Cancel an active Vault Raid and refund all bets',
			usage: '!vault cancel',
			permission: 'moderator',
			handler: handleVaultCancel,
			templates: [
				'points.vault.not-active',
				'points.vault.cancelled',
			],
		},
	},
})
