import { botLogger } from '~~/server/utils/logger'
import { defineTemplates } from '../../core/templates'

export const alertsTemplates = defineTemplates({
	domain: 'alerts',
	category: 'general',
	editUrl: '/admin/alerts',
	templates: {
		'eventsub.alert.follow': {
			name: 'Follow Alert',
			description: 'Chat alert sent when a new viewer follows the channel.',
			default: 'Thank you for the follow, $(follower)!',
			params: {
				'follower': { label: 'Follower Display Name', description: 'The display name of the follower.', example: 'CoolFella123' },
				'follower.name': { label: 'Follower Username', description: 'The lowercase login username of the follower.', example: 'coolfella123' },
				'follower.id': { label: 'Follower ID', description: 'The unique Twitch user ID of the follower.', example: '12345678' },
			},
		},
		'eventsub.alert.sub': {
			name: 'Subscription Alert',
			description: 'Chat alert sent when a viewer subscribes or resubscribes.',
			default: 'Thank you for subscribing, $(subscriber)! Welcome to the club!',
			params: {
				'subscriber': { label: 'Subscriber Display Name', description: 'The display name of the subscriber.', example: 'SammySub' },
				'subscriber.name': { label: 'Subscriber Username', description: 'The lowercase login username of the subscriber.', example: 'sammysub' },
				'subscriber.id': { label: 'Subscriber ID', description: 'The unique Twitch user ID of the subscriber.', example: '87654321' },
				'tier': { label: 'Subscription Tier', description: 'The subscription tier (Tier 1, Tier 2, Tier 3, or Prime).', example: 'Tier 1' },
			},
		},
		'eventsub.alert.gift': {
			name: 'Sub Gift Alert',
			description: 'Chat alert sent when a viewer gifts one or more subscriptions.',
			default: 'Thank you @$(gifter) for gifting $(count) sub(s) to the community!',
			params: {
				'gifter': { label: 'Gifter Display Name', description: 'The display name of the gift sender.', example: 'KindDonor' },
				'gifter.name': { label: 'Gifter Username', description: 'The lowercase login username of the gifter.', example: 'kinddonor' },
				'gifter.id': { label: 'Gifter ID', description: 'The unique Twitch user ID of the gifter.', example: '99887766' },
				'count': { label: 'Gift Count', description: 'The number of subscriptions gifted.', example: 5 },
			},
		},
		'eventsub.alert.cheer': {
			name: 'Bits Cheer Alert',
			description: 'Chat alert sent when a viewer cheers with bits.',
			default: 'Thank you @$(cheerer) for cheering $(bits) bits! $(message)',
			params: {
				'cheerer': { label: 'Cheerer Display Name', description: 'The display name of the cheerer.', example: 'BitHype' },
				'cheerer.name': { label: 'Cheerer Username', description: 'The lowercase login username of the cheerer.', example: 'bithype' },
				'cheerer.id': { label: 'Cheerer ID', description: 'The unique Twitch user ID of the cheerer.', example: '44556677' },
				'bits': { label: 'Bits Amount', description: 'The number of bits cheered.', example: 500 },
				'message': { label: 'Cheer Message', description: 'The message attached to the cheer.', example: 'Hype stream!' },
			},
		},
		'eventsub.alert.raid': {
			name: 'Incoming Raid Alert',
			description: 'Chat alert sent when another channel raids the stream.',
			default: 'Thank you for the raid, $(raider) with $(viewers) viewers!',
			params: {
				'raider': { label: 'Raider Display Name', description: 'The display name of the raiding channel.', example: 'FellowCreator' },
				'raider.name': { label: 'Raider Username', description: 'The lowercase login username of the raider.', example: 'fellowcreator' },
				'raider.id': { label: 'Raider ID', description: 'The unique Twitch user ID of the raider.', example: '33221100' },
				'viewers': { label: 'Viewer Count', description: 'The number of raiders joining.', example: 45 },
			},
		},
		'eventsub.alert.live': {
			name: 'Stream Live Alert',
			description: 'Chat alert sent when the stream goes online.',
			default: 'We are now live playing $(game) - $(title)!',
			params: {
				broadcaster: { label: 'Broadcaster Name', description: 'The display name of the broadcaster.', example: 'Streamer' },
				game: { label: 'Game Name', description: 'The current game or category.', example: 'Elden Ring' },
				title: { label: 'Stream Title', description: 'The title of the stream broadcast.', example: 'Friday Gaming Night!' },
			},
		},
		'eventsub.alert.offline': {
			name: 'Stream Offline Alert',
			description: 'Chat alert sent when the stream ends.',
			default: 'Stream has ended. Thanks for hanging out!',
			params: {
				broadcaster: { label: 'Broadcaster Name', description: 'The display name of the broadcaster.', example: 'Streamer' },
			},
		},
		'eventsub.alert.ban': {
			name: 'User Ban Alert',
			description: 'Chat alert sent when a user is permanently banned.',
			default: '$(target) has been banned from the channel.',
			params: {
				'target': { label: 'Target Display Name', description: 'The display name of the banned user.', example: 'BannedUser' },
				'target.name': { label: 'Target Username', description: 'The login username of the banned user.', example: 'banneduser' },
				'target.id': { label: 'Target User ID', description: 'The user ID of the banned user.', example: '11223344' },
				'moderator': { label: 'Moderator Name', description: 'The name of the moderator who executed the ban.', example: 'ModMaster' },
			},
		},
		'eventsub.alert.timeout': {
			name: 'User Timeout Alert',
			description: 'Chat alert sent when a user is timed out.',
			default: '$(target) has been timed out for $(duration) seconds.',
			params: {
				'target': { label: 'Target Display Name', description: 'The display name of the timed out user.', example: 'TimeoutUser' },
				'target.name': { label: 'Target Username', description: 'The login username of the timed out user.', example: 'timeoutuser' },
				'target.id': { label: 'Target User ID', description: 'The user ID of the timed out user.', example: '55667788' },
				'duration': { label: 'Timeout Duration', description: 'Duration of the timeout in seconds.', example: 600 },
				'moderator': { label: 'Moderator Name', description: 'The name of the moderator who executed the timeout.', example: 'ModMaster' },
			},
		},
		'eventsub.alert.unban': {
			name: 'User Unban Alert',
			description: 'Chat alert sent when a user is unbanned.',
			default: '$(target) has been unbanned.',
			params: {
				'target': { label: 'Target Display Name', description: 'The display name of the unbanned user.', example: 'PardonedUser' },
				'target.name': { label: 'Target Username', description: 'The login username of the unbanned user.', example: 'pardoneduser' },
				'target.id': { label: 'Target User ID', description: 'The user ID of the unbanned user.', example: '66778899' },
				'moderator': { label: 'Moderator Name', description: 'The name of the moderator who unbanned the user.', example: 'ModMaster' },
			},
		},
		'eventsub.alert.message_delete': {
			name: 'Message Deleted Alert',
			description: 'Chat alert sent when an individual chat message is removed by a moderator.',
			default: 'A message from $(target) was deleted.',
			params: {
				'target': { label: 'Author Display Name', description: 'The display name of the user whose message was deleted.', example: 'Chatter123' },
				'target.name': { label: 'Author Username', description: 'The login username of the chatter.', example: 'chatter123' },
				'target.id': { label: 'Author User ID', description: 'The user ID of the chatter.', example: '77889900' },
				'message': { label: 'Deleted Message', description: 'The text of the deleted message.', example: 'Spam message' },
				'moderator': { label: 'Moderator Name', description: 'The name of the moderator who removed the message.', example: 'ModMaster' },
			},
		},
		'eventsub.alert.adbreak': {
			name: 'Ad Break Started Alert',
			description: 'Chat alert sent when a commercial break begins running on Twitch.',
			default: 'An ad break of $(duration) seconds has started!',
			params: {
				duration: { label: 'Ad Break Duration', description: 'Length of the commercial break in seconds.', example: 90 },
				requester: { label: 'Requester Name', description: 'The user or system that initiated the commercial.', example: 'Streamer' },
			},
		},
	},
})

export function registerAlertsTemplates() {
	botLogger.info('Registering EventSub alerts templates...')
	alertsTemplates.register()
}
