import { botLogger } from '~~/server/utils/logger'
import { defineTemplates } from '../../core/templates'

export const discordTemplates = defineTemplates({
	domain: 'discord',
	category: 'general',
	editUrl: '/admin/discord/alerts',
	templates: {
		'discord.events.join': {
			name: 'Discord Member Join',
			editUrl: '/admin/discord/events',
			description: 'Notification posted to Discord when a new member joins the server.',
			default: 'Welcome to $(server), $(user)!',
			params: {
				user: { label: 'User Mention', description: 'Discord user mention tag (<@id>).', example: '@NewMember' },
				username: { label: 'Plain Username', description: 'Plain text username of the joining member.', example: 'newmember' },
				server: { label: 'Server Name', description: 'Name of the Discord server guild.', example: 'Soulbot Community' },
				memberCount: { label: 'Total Server Members', description: 'Total number of members currently in the server.', example: 1250 },
			},
		},
		'discord.events.leave': {
			name: 'Discord Member Leave',
			editUrl: '/admin/discord/events',
			description: 'Notification posted to Discord when a member leaves the server.',
			default: '$(username) has left $(server).',
			params: {
				username: { label: 'Plain Username', description: 'Plain text username of the leaving member.', example: 'exmember' },
				server: { label: 'Server Name', description: 'Name of the Discord server guild.', example: 'Soulbot Community' },
				memberCount: { label: 'Total Server Members', description: 'Total number of members currently in the server.', example: 1249 },
			},
		},
		'discord.alert.follow': {
			name: 'Discord Follow Alert',
			description: 'Discord channel announcement for Twitch follow events.',
			default: 'Thank you for the follow, $(follower)!',
			params: {
				'follower': { label: 'Follower Display Name', description: 'The display name of the follower.', example: 'CoolFella123' },
				'follower.name': { label: 'Follower Username', description: 'The lowercase login username of the follower.', example: 'CoolFella123' },
			},
		},
		'discord.alert.sub': {
			name: 'Discord Sub Alert',
			description: 'Discord channel announcement for Twitch subscription events.',
			default: 'Thank you for subscribing, $(subscriber)! Welcome to the club!',
			params: {
				'subscriber': { label: 'Subscriber Display Name', description: 'The display name of the subscriber.', example: 'SammySub' },
				'subscriber.name': { label: 'Subscriber Username', description: 'The lowercase login username of the subscriber.', example: 'sammysub' },
				'tier': { label: 'Subscription Tier', description: 'The subscription tier.', example: 'Tier 1' },
			},
		},
		'discord.alert.gift': {
			name: 'Discord Sub Gift Alert',
			description: 'Discord channel announcement for Twitch sub gifts.',
			default: 'Thank you @$(gifter) for gifting $(count) sub(s) to the community!',
			params: {
				gifter: { label: 'Gifter Display Name', description: 'The display name of the gifter.', example: 'KindDonor' },
				count: { label: 'Gift Count', description: 'The number of subscriptions gifted.', example: 5 },
			},
		},
		'discord.alert.cheer': {
			name: 'Discord Bits Alert',
			description: 'Discord channel announcement for Twitch cheer events.',
			default: 'Thank you @$(cheerer) for cheering $(bits) bits! $(message)',
			params: {
				cheerer: { label: 'Cheerer Display Name', description: 'The display name of the cheerer.', example: 'BitHype' },
				bits: { label: 'Bits Amount', description: 'The number of bits cheered.', example: 500 },
				message: { label: 'Cheer Message', description: 'The message attached to the cheer.', example: 'Hype stream!' },
			},
		},
		'discord.alert.raid': {
			name: 'Discord Raid Alert',
			description: 'Discord channel announcement for Twitch incoming raids.',
			default: '$(raider) is raiding us with $(viewers) viewers!',
			params: {
				raider: { label: 'Raider Display Name', description: 'The display name of the raiding channel.', example: 'FellowCreator' },
				viewers: { label: 'Viewer Count', description: 'The number of raiders joining.', example: 45 },
			},
		},
		'discord.alert.live': {
			name: 'Discord Stream Live Alert',
			description: 'Discord channel announcement when stream goes live.',
			default: '@everyone $(broadcaster) is now live on Twitch playing $(game) - $(title)!',
			params: {
				broadcaster: { label: 'Broadcaster Name', description: 'The display name of the broadcaster.', example: 'Streamer' },
				game: { label: 'Game Name', description: 'The current game or category.', example: 'Elden Ring' },
				title: { label: 'Stream Title', description: 'The title of the stream broadcast.', example: 'Friday Gaming Night!' },
			},
		},
		'discord.alert.offline': {
			name: 'Discord Stream Offline Alert',
			description: 'Discord channel announcement when stream ends.',
			default: 'The stream has ended. Thanks for watching!',
			params: {
				broadcaster: { label: 'Broadcaster Name', description: 'The display name of the broadcaster.', example: 'Streamer' },
			},
		},
		'discord.alert.ban': {
			name: 'Discord Ban Alert',
			description: 'Discord channel announcement when a Twitch user is banned.',
			default: '$(target) has been banned from the channel.',
			params: {
				target: { label: 'Target Display Name', description: 'The display name of the banned user.', example: 'BannedUser' },
			},
		},
		'discord.alert.timeout': {
			name: 'Discord Timeout Alert',
			description: 'Discord channel announcement when a Twitch user is timed out.',
			default: '$(target) has been timed out for $(duration) seconds.',
			params: {
				target: { label: 'Target Display Name', description: 'The display name of the timed out user.', example: 'TimeoutUser' },
				duration: { label: 'Timeout Duration', description: 'Duration of the timeout in seconds.', example: 600 },
			},
		},
		'discord.alert.unban': {
			name: 'Discord Unban Alert',
			description: 'Discord channel announcement when a Twitch user is unbanned.',
			default: '$(target) has been unbanned.',
			params: {
				target: { label: 'Target Display Name', description: 'The display name of the unbanned user.', example: 'PardonedUser' },
			},
		},
		'discord.alert.message_delete': {
			name: 'Discord Message Delete Alert',
			description: 'Discord channel announcement when a Twitch message is deleted.',
			default: 'A message from $(target) was deleted.',
			params: {
				target: { label: 'Author Display Name', description: 'The display name of the author.', example: 'Chatter123' },
			},
		},
	},
})

export function registerDiscordTemplates() {
	botLogger.info('Registering Discord alerts & events templates...')
	discordTemplates.register()
}
