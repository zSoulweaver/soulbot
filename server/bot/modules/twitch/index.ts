import { z } from 'zod'
import { defineCommand } from '../../core/define-command'
import { TwitchUser } from '../../core/schemas'
import { handleFollowage } from './handlers/followage'
import { handleUptime } from './handlers/uptime'
import { registerTwitchTemplates } from './templates'

registerTwitchTemplates()

const followageCommand = defineCommand({
	id: 'followage',
	description: 'Check follow duration for yourself or another user',
	usage: '!followage [username]',
	permission: 'everyone',
	args: z.tuple([TwitchUser.optional()]),
	templates: [
		'twitch.followage.success',
		'twitch.followage.success-self',
		'twitch.followage.not-following',
		'twitch.followage.not-following-self',
		'twitch.followage.user-not-found',
	],
	handler: handleFollowage,
})

const uptimeCommand = defineCommand({
	id: 'uptime',
	description: 'Check stream uptime',
	usage: '!uptime',
	permission: 'everyone',
	templates: [
		'twitch.uptime.online',
		'twitch.uptime.offline',
	],
	handler: handleUptime,
})

export const twitchModule = [
	followageCommand,
	uptimeCommand,
]
