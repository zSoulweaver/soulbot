import { z } from 'zod'
import { defineCommand } from '../../core/define-command'
import { handleCommercial } from './handlers/commercial'
import { handleSnooze } from './handlers/snooze'
import { registerAdsTemplates } from './templates'

registerAdsTemplates()

export const adsModule = defineCommand({
	id: 'commercial',
	description: 'Trigger a commercial break or snooze the upcoming ad',
	usage: '!commercial [30|60|90|120|150|180|snooze]',
	permission: 'moderator',
	args: z.tuple([
		z.union([
			z.literal('30'),
			z.literal('60'),
			z.literal('90'),
			z.literal('120'),
			z.literal('150'),
			z.literal('180'),
		]).optional(),
	]),
	templates: [
		'ads.commercial.success',
		'ads.commercial.error',
	],
	handler: handleCommercial,
	subcommands: {
		snooze: {
			description: 'Snooze the upcoming scheduled ad break',
			permission: 'moderator',
			handler: handleSnooze,
			templates: [
				'ads.snooze.success',
				'ads.snooze.error',
			],
		},
	},
})
