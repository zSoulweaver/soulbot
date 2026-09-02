export interface TemplateVariableMeta {
	name: string
	label: string
	description: string
	example: string | number
	category?: 'event' | 'global' | 'custom'
}

export interface TemplateScopeDefinition {
	id: string
	name: string
	domain: 'alerts' | 'discord' | 'ads' | 'vault' | 'gambling' | 'commands' | 'timers' | 'widgets'
	description: string
	defaultTemplate: string
	variables: TemplateVariableMeta[]
}

export interface TemplateCatalogResponse {
	globalVariables: TemplateVariableMeta[]
	scopes: Record<string, TemplateScopeDefinition>
}

export const GLOBAL_TEMPLATE_VARIABLES: TemplateVariableMeta[] = [
	{
		name: 'core.currency',
		label: 'Dynamic Currency Name',
		description: 'Automatically switches between singular and plural currency name based on amount.',
		example: 'Points',
		category: 'global',
	},
	{
		name: 'core.currency_singular',
		label: 'Singular Currency Name',
		description: 'The singular name configured for stream currency (e.g. "Point").',
		example: 'Point',
		category: 'global',
	},
	{
		name: 'core.currency_plural',
		label: 'Plural Currency Name',
		description: 'The plural name configured for stream currency (e.g. "Points").',
		example: 'Points',
		category: 'global',
	},
	{
		name: 'channel',
		label: 'Channel Name',
		description: 'The current Twitch broadcaster channel login name.',
		example: 'streamer',
		category: 'global',
	},
	{
		name: 'uptime',
		label: 'Stream Uptime',
		description: 'Formatted duration the stream has been live.',
		example: '2 hours 15 minutes',
		category: 'global',
	},
	{
		name: 'followage',
		label: 'Follow Age',
		description: 'How long the user has been following the channel.',
		example: '1 year 4 months',
		category: 'global',
	},
	{
		name: 'randint',
		label: 'Random Number',
		description: 'Generates a random integer (1-100 by default, or $(randint min max)).',
		example: '42',
		category: 'global',
	},
	{
		name: 'points',
		label: 'User Points Balance',
		description: 'The current points balance of the user.',
		example: '1500',
		category: 'global',
	},
]

export const TEMPLATE_SCOPES: Record<string, TemplateScopeDefinition> = {
	// ==========================================
	// Twitch EventSub Alerts
	// ==========================================
	'eventsub.alert.follow': {
		id: 'eventsub.alert.follow',
		name: 'Follow Alert',
		domain: 'alerts',
		description: 'Chat alert sent when a new viewer follows the channel.',
		defaultTemplate: 'Thank you for the follow, $(follower)!',
		variables: [
			{ name: 'follower', label: 'Follower Display Name', description: 'The display name of the follower.', example: 'CoolFella123' },
			{ name: 'follower.name', label: 'Follower Username', description: 'The lowercase login username of the follower.', example: 'CoolFella123' },
			{ name: 'follower.id', label: 'Follower ID', description: 'The unique Twitch user ID of the follower.', example: '12345678' },
		],
	},
	'eventsub.alert.sub': {
		id: 'eventsub.alert.sub',
		name: 'Subscription Alert',
		domain: 'alerts',
		description: 'Chat alert sent when a viewer subscribes or resubscribes.',
		defaultTemplate: 'Thank you for subscribing, $(subscriber)! Welcome to the club!',
		variables: [
			{ name: 'subscriber', label: 'Subscriber Display Name', description: 'The display name of the subscriber.', example: 'SammySub' },
			{ name: 'subscriber.name', label: 'Subscriber Username', description: 'The lowercase login username of the subscriber.', example: 'sammysub' },
			{ name: 'subscriber.id', label: 'Subscriber ID', description: 'The unique Twitch user ID of the subscriber.', example: '87654321' },
			{ name: 'tier', label: 'Subscription Tier', description: 'The subscription tier (Tier 1, Tier 2, Tier 3, or Prime).', example: 'Tier 1' },
		],
	},
	'eventsub.alert.gift': {
		id: 'eventsub.alert.gift',
		name: 'Sub Gift Alert',
		domain: 'alerts',
		description: 'Chat alert sent when a viewer gifts one or more subscriptions.',
		defaultTemplate: 'Thank you @$(gifter) for gifting $(count) sub(s) to the community!',
		variables: [
			{ name: 'gifter', label: 'Gifter Display Name', description: 'The display name of the gift sender.', example: 'KindDonor' },
			{ name: 'gifter.name', label: 'Gifter Username', description: 'The lowercase login username of the gifter.', example: 'kinddonor' },
			{ name: 'gifter.id', label: 'Gifter ID', description: 'The unique Twitch user ID of the gifter.', example: '99887766' },
			{ name: 'count', label: 'Gift Count', description: 'The number of subscriptions gifted.', example: '5' },
		],
	},
	'eventsub.alert.cheer': {
		id: 'eventsub.alert.cheer',
		name: 'Bits Cheer Alert',
		domain: 'alerts',
		description: 'Chat alert sent when a viewer cheers with bits.',
		defaultTemplate: 'Thank you @$(cheerer) for cheering $(bits) bits! $(message)',
		variables: [
			{ name: 'cheerer', label: 'Cheerer Display Name', description: 'The display name of the cheerer.', example: 'BitHype' },
			{ name: 'cheerer.name', label: 'Cheerer Username', description: 'The lowercase login username of the cheerer.', example: 'bithype' },
			{ name: 'cheerer.id', label: 'Cheerer ID', description: 'The unique Twitch user ID of the cheerer.', example: '44556677' },
			{ name: 'bits', label: 'Bits Amount', description: 'The number of bits cheered.', example: '500' },
			{ name: 'message', label: 'Cheer Message', description: 'The message attached to the cheer.', example: 'Hype stream!' },
		],
	},
	'eventsub.alert.raid': {
		id: 'eventsub.alert.raid',
		name: 'Incoming Raid Alert',
		domain: 'alerts',
		description: 'Chat alert sent when another channel raids the stream.',
		defaultTemplate: 'Thank you for the raid, $(raider) with $(viewers) viewers!',
		variables: [
			{ name: 'raider', label: 'Raider Display Name', description: 'The display name of the raiding channel.', example: 'FellowCreator' },
			{ name: 'raider.name', label: 'Raider Username', description: 'The lowercase login username of the raider.', example: 'fellowcreator' },
			{ name: 'raider.id', label: 'Raider ID', description: 'The unique Twitch user ID of the raider.', example: '33221100' },
			{ name: 'viewers', label: 'Viewer Count', description: 'The number of raiders joining.', example: '45' },
		],
	},
	'eventsub.alert.live': {
		id: 'eventsub.alert.live',
		name: 'Stream Live Alert',
		domain: 'alerts',
		description: 'Chat alert sent when the stream goes online.',
		defaultTemplate: 'We are now live playing $(game) - $(title)!',
		variables: [
			{ name: 'broadcaster', label: 'Broadcaster Name', description: 'The display name of the broadcaster.', example: 'Streamer' },
			{ name: 'game', label: 'Game Name', description: 'The current game or category.', example: 'Elden Ring' },
			{ name: 'title', label: 'Stream Title', description: 'The title of the stream broadcast.', example: 'Friday Gaming Night!' },
		],
	},
	'eventsub.alert.offline': {
		id: 'eventsub.alert.offline',
		name: 'Stream Offline Alert',
		domain: 'alerts',
		description: 'Chat alert sent when the stream ends.',
		defaultTemplate: 'Stream has ended. Thanks for hanging out!',
		variables: [
			{ name: 'broadcaster', label: 'Broadcaster Name', description: 'The display name of the broadcaster.', example: 'Streamer' },
		],
	},
	'eventsub.alert.ban': {
		id: 'eventsub.alert.ban',
		name: 'User Ban Alert',
		domain: 'alerts',
		description: 'Chat alert sent when a user is permanently banned.',
		defaultTemplate: '$(target) has been banned from the channel.',
		variables: [
			{ name: 'target', label: 'Target Display Name', description: 'The display name of the banned user.', example: 'BannedUser' },
			{ name: 'target.name', label: 'Target Username', description: 'The login username of the banned user.', example: 'banneduser' },
			{ name: 'target.id', label: 'Target User ID', description: 'The user ID of the banned user.', example: '11223344' },
			{ name: 'moderator', label: 'Moderator Name', description: 'The name of the moderator who executed the ban.', example: 'ModMaster' },
		],
	},
	'eventsub.alert.timeout': {
		id: 'eventsub.alert.timeout',
		name: 'User Timeout Alert',
		domain: 'alerts',
		description: 'Chat alert sent when a user is timed out.',
		defaultTemplate: '$(target) has been timed out for $(duration) seconds.',
		variables: [
			{ name: 'target', label: 'Target Display Name', description: 'The display name of the timed out user.', example: 'TimeoutUser' },
			{ name: 'target.name', label: 'Target Username', description: 'The login username of the timed out user.', example: 'timeoutuser' },
			{ name: 'target.id', label: 'Target User ID', description: 'The user ID of the timed out user.', example: '55667788' },
			{ name: 'duration', label: 'Timeout Duration', description: 'Duration of the timeout in seconds.', example: '600' },
			{ name: 'moderator', label: 'Moderator Name', description: 'The name of the moderator who executed the timeout.', example: 'ModMaster' },
		],
	},
	'eventsub.alert.unban': {
		id: 'eventsub.alert.unban',
		name: 'User Unban Alert',
		domain: 'alerts',
		description: 'Chat alert sent when a user is unbanned.',
		defaultTemplate: '$(target) has been unbanned.',
		variables: [
			{ name: 'target', label: 'Target Display Name', description: 'The display name of the unbanned user.', example: 'PardonedUser' },
			{ name: 'target.name', label: 'Target Username', description: 'The login username of the unbanned user.', example: 'pardoneduser' },
			{ name: 'target.id', label: 'Target User ID', description: 'The user ID of the unbanned user.', example: '66778899' },
			{ name: 'moderator', label: 'Moderator Name', description: 'The name of the moderator who unbanned the user.', example: 'ModMaster' },
		],
	},
	'eventsub.alert.message_delete': {
		id: 'eventsub.alert.message_delete',
		name: 'Message Deleted Alert',
		domain: 'alerts',
		description: 'Chat alert sent when an individual chat message is removed by a moderator.',
		defaultTemplate: 'A message from $(target) was deleted.',
		variables: [
			{ name: 'target', label: 'Author Display Name', description: 'The display name of the user whose message was deleted.', example: 'Chatter123' },
			{ name: 'target.name', label: 'Author Username', description: 'The login username of the chatter.', example: 'chatter123' },
			{ name: 'target.id', label: 'Author User ID', description: 'The user ID of the chatter.', example: '77889900' },
			{ name: 'message', label: 'Deleted Message', description: 'The text of the deleted message.', example: 'Spam message' },
			{ name: 'moderator', label: 'Moderator Name', description: 'The name of the moderator who removed the message.', example: 'ModMaster' },
		],
	},
	'eventsub.alert.adbreak': {
		id: 'eventsub.alert.adbreak',
		name: 'Ad Break Started Alert',
		domain: 'alerts',
		description: 'Chat alert sent when a commercial break begins running on Twitch.',
		defaultTemplate: 'An ad break of $(duration) seconds has started!',
		variables: [
			{ name: 'duration', label: 'Ad Break Duration', description: 'Length of the commercial break in seconds.', example: '90' },
			{ name: 'requester', label: 'Requester Name', description: 'The user or system that initiated the commercial.', example: 'Streamer' },
		],
	},

	// ==========================================
	// Discord Events & Alerts
	// ==========================================
	'discord.events.join': {
		id: 'discord.events.join',
		name: 'Discord Member Join',
		domain: 'discord',
		description: 'Notification posted to Discord when a new member joins the server.',
		defaultTemplate: 'Welcome to $(server), $(user)!',
		variables: [
			{ name: 'user', label: 'User Mention', description: 'Discord user mention tag (<@id>).', example: '@NewMember' },
			{ name: 'username', label: 'Plain Username', description: 'Plain text username of the joining member.', example: 'newmember' },
			{ name: 'server', label: 'Server Name', description: 'Name of the Discord server guild.', example: 'Soulbot Community' },
			{ name: 'memberCount', label: 'Total Server Members', description: 'Total number of members currently in the server.', example: '1250' },
		],
	},
	'discord.events.leave': {
		id: 'discord.events.leave',
		name: 'Discord Member Leave',
		domain: 'discord',
		description: 'Notification posted to Discord when a member leaves the server.',
		defaultTemplate: '$(username) has left $(server).',
		variables: [
			{ name: 'username', label: 'Plain Username', description: 'Plain text username of the leaving member.', example: 'exmember' },
			{ name: 'server', label: 'Server Name', description: 'Name of the Discord server guild.', example: 'Soulbot Community' },
			{ name: 'memberCount', label: 'Total Server Members', description: 'Total number of members currently in the server.', example: '1249' },
		],
	},
	'discord.alert.follow': {
		id: 'discord.alert.follow',
		name: 'Discord Follow Alert',
		domain: 'discord',
		description: 'Discord channel announcement for Twitch follow events.',
		defaultTemplate: 'Thank you for the follow, $(follower)!',
		variables: [
			{ name: 'follower', label: 'Follower Display Name', description: 'The display name of the follower.', example: 'CoolFella123' },
			{ name: 'follower.name', label: 'Follower Username', description: 'The lowercase login username of the follower.', example: 'CoolFella123' },
		],
	},
	'discord.alert.sub': {
		id: 'discord.alert.sub',
		name: 'Discord Sub Alert',
		domain: 'discord',
		description: 'Discord channel announcement for Twitch subscription events.',
		defaultTemplate: 'Thank you for subscribing, $(subscriber)! Welcome to the club!',
		variables: [
			{ name: 'subscriber', label: 'Subscriber Display Name', description: 'The display name of the subscriber.', example: 'SammySub' },
			{ name: 'subscriber.name', label: 'Subscriber Username', description: 'The lowercase login username of the subscriber.', example: 'sammysub' },
			{ name: 'tier', label: 'Subscription Tier', description: 'The subscription tier.', example: 'Tier 1' },
		],
	},
	'discord.alert.gift': {
		id: 'discord.alert.gift',
		name: 'Discord Sub Gift Alert',
		domain: 'discord',
		description: 'Discord channel announcement for Twitch sub gifts.',
		defaultTemplate: 'Thank you @$(gifter) for gifting $(count) sub(s) to the community!',
		variables: [
			{ name: 'gifter', label: 'Gifter Display Name', description: 'The display name of the gifter.', example: 'KindDonor' },
			{ name: 'count', label: 'Gift Count', description: 'The number of subscriptions gifted.', example: '5' },
		],
	},
	'discord.alert.cheer': {
		id: 'discord.alert.cheer',
		name: 'Discord Bits Alert',
		domain: 'discord',
		description: 'Discord channel announcement for Twitch cheer events.',
		defaultTemplate: 'Thank you @$(cheerer) for cheering $(bits) bits! $(message)',
		variables: [
			{ name: 'cheerer', label: 'Cheerer Display Name', description: 'The display name of the cheerer.', example: 'BitHype' },
			{ name: 'bits', label: 'Bits Amount', description: 'The number of bits cheered.', example: '500' },
			{ name: 'message', label: 'Cheer Message', description: 'The message attached to the cheer.', example: 'Hype stream!' },
		],
	},
	'discord.alert.raid': {
		id: 'discord.alert.raid',
		name: 'Discord Raid Alert',
		domain: 'discord',
		description: 'Discord channel announcement for Twitch incoming raids.',
		defaultTemplate: '$(raider) is raiding us with $(viewers) viewers!',
		variables: [
			{ name: 'raider', label: 'Raider Display Name', description: 'The display name of the raiding channel.', example: 'FellowCreator' },
			{ name: 'viewers', label: 'Viewer Count', description: 'The number of raiders joining.', example: '45' },
		],
	},
	'discord.alert.live': {
		id: 'discord.alert.live',
		name: 'Discord Stream Live Alert',
		domain: 'discord',
		description: 'Discord channel announcement when stream goes live.',
		defaultTemplate: '@everyone $(broadcaster) is now live on Twitch playing $(game) - $(title)!',
		variables: [
			{ name: 'broadcaster', label: 'Broadcaster Name', description: 'The display name of the broadcaster.', example: 'Streamer' },
			{ name: 'game', label: 'Game Name', description: 'The current game or category.', example: 'Elden Ring' },
			{ name: 'title', label: 'Stream Title', description: 'The title of the stream broadcast.', example: 'Friday Gaming Night!' },
		],
	},
	'discord.alert.offline': {
		id: 'discord.alert.offline',
		name: 'Discord Stream Offline Alert',
		domain: 'discord',
		description: 'Discord channel announcement when stream ends.',
		defaultTemplate: 'The stream has ended. Thanks for watching!',
		variables: [
			{ name: 'broadcaster', label: 'Broadcaster Name', description: 'The display name of the broadcaster.', example: 'Streamer' },
		],
	},
	'discord.alert.ban': {
		id: 'discord.alert.ban',
		name: 'Discord Ban Alert',
		domain: 'discord',
		description: 'Discord channel announcement when a Twitch user is banned.',
		defaultTemplate: '$(target) has been banned from the channel.',
		variables: [
			{ name: 'target', label: 'Target Display Name', description: 'The display name of the banned user.', example: 'BannedUser' },
		],
	},
	'discord.alert.timeout': {
		id: 'discord.alert.timeout',
		name: 'Discord Timeout Alert',
		domain: 'discord',
		description: 'Discord channel announcement when a Twitch user is timed out.',
		defaultTemplate: '$(target) has been timed out for $(duration) seconds.',
		variables: [
			{ name: 'target', label: 'Target Display Name', description: 'The display name of the timed out user.', example: 'TimeoutUser' },
			{ name: 'duration', label: 'Timeout Duration', description: 'Duration of the timeout in seconds.', example: '600' },
		],
	},
	'discord.alert.unban': {
		id: 'discord.alert.unban',
		name: 'Discord Unban Alert',
		domain: 'discord',
		description: 'Discord channel announcement when a Twitch user is unbanned.',
		defaultTemplate: '$(target) has been unbanned.',
		variables: [
			{ name: 'target', label: 'Target Display Name', description: 'The display name of the unbanned user.', example: 'PardonedUser' },
		],
	},
	'discord.alert.message_delete': {
		id: 'discord.alert.message_delete',
		name: 'Discord Message Delete Alert',
		domain: 'discord',
		description: 'Discord channel announcement when a Twitch message is deleted.',
		defaultTemplate: 'A message from $(target) was deleted.',
		variables: [
			{ name: 'target', label: 'Author Display Name', description: 'The display name of the author.', example: 'Chatter123' },
		],
	},

	// ==========================================
	// Advertisements
	// ==========================================
	'ads.alert': {
		id: 'ads.alert',
		name: 'Ad Break Warning Message',
		domain: 'ads',
		description: 'Chat warning message posted before a scheduled commercial break starts.',
		defaultTemplate: 'Ad break of $(duration) seconds is starting in $(time)!',
		variables: [
			{ name: 'time', label: 'Time Until Break', description: 'Formatted countdown time until the ad break begins (e.g. "5 minutes").', example: '5 minutes' },
			{ name: 'duration', label: 'Ad Break Duration', description: 'Duration of the upcoming commercial break in seconds.', example: '90' },
		],
	},

	// ==========================================
	// Loyalty Games: Vault Raid
	// ==========================================
	'vault.start': {
		id: 'vault.start',
		name: 'Vault Raid Start Announcement',
		domain: 'vault',
		description: 'Chat announcement sent when a communal Vault Raid is initiated.',
		defaultTemplate: 'A Vault Raid has begun! Type !vault <bet> to enter the squad. Betting closes in $(duration) seconds! (Multiplier: $(multiplier)x, Bets: $(minBet)-$(maxBet) $(core.currency))',
		variables: [
			{ name: 'duration', label: 'Raid Duration', description: 'Duration of the betting window in seconds.', example: '90' },
			{ name: 'multiplier', label: 'Win Multiplier', description: 'Profit multiplier for successful raiders.', example: '2.0' },
			{ name: 'minBet', label: 'Minimum Bet', description: 'Minimum points required to join.', example: '10' },
			{ name: 'maxBet', label: 'Maximum Bet', description: 'Maximum points allowed per user.', example: '100000' },
		],
	},
	'vault.warning': {
		id: 'vault.warning',
		name: 'Vault Raid Warning Announcement',
		domain: 'vault',
		description: 'Chat announcement sent when 15 seconds remain in the betting window.',
		defaultTemplate: '15 seconds remaining to join the Vault Raid! Current Squad: $(raidersCount) raiders, Pot: $(pot) $(core.currency)!',
		variables: [
			{ name: 'secondsLeft', label: 'Seconds Remaining', description: 'Seconds remaining before betting closes.', example: '15' },
			{ name: 'raidersCount', label: 'Raiders Count', description: 'Total number of users currently entered in the raid.', example: '12' },
			{ name: 'pot', label: 'Total Pot Size', description: 'Total points wagered by all raiders combined.', example: '25000' },
			{ name: 'multiplier', label: 'Win Multiplier', description: 'Profit multiplier for successful raiders.', example: '2.0' },
		],
	},
	'vault.win': {
		id: 'vault.win',
		name: 'Vault Raid Win Announcement',
		domain: 'vault',
		description: 'Chat announcement sent when the Vault Raid succeeds.',
		defaultTemplate: 'VAULT CRACKED! Rolled $(roll) (needed $(threshold)+). $(raidersCount) raiders successfully escaped with a total of $(totalWon) $(core.currency)!',
		variables: [
			{ name: 'roll', label: 'Die Roll Result', description: 'The communal roll number from 1 to 100.', example: '85' },
			{ name: 'threshold', label: 'Winning Roll Threshold', description: 'Minimum roll needed to win.', example: '50' },
			{ name: 'raidersCount', label: 'Raiders Count', description: 'Total number of winning raiders.', example: '12' },
			{ name: 'pot', label: 'Total Initial Pot', description: 'Total points wagered by raiders.', example: '25000' },
			{ name: 'totalWon', label: 'Total Points Paid Out', description: 'Total profit paid out to all raiders.', example: '50000' },
			{ name: 'multiplier', label: 'Win Multiplier', description: 'Profit multiplier.', example: '2.0' },
		],
	},
	'vault.lose': {
		id: 'vault.lose',
		name: 'Vault Raid Lose Announcement',
		domain: 'vault',
		description: 'Chat announcement sent when the Vault Raid fails.',
		defaultTemplate: 'VAULT LOCKDOWN! Rolled $(roll) (needed $(threshold)+). The vault guards captured all $(raidersCount) raiders and seized the $(pot) $(core.currency) pot!',
		variables: [
			{ name: 'roll', label: 'Die Roll Result', description: 'The communal roll number from 1 to 100.', example: '24' },
			{ name: 'threshold', label: 'Winning Roll Threshold', description: 'Minimum roll needed to win.', example: '50' },
			{ name: 'raidersCount', label: 'Raiders Count', description: 'Total number of raiders caught.', example: '12' },
			{ name: 'pot', label: 'Total Lost Pot', description: 'Total points lost in the raid.', example: '25000' },
			{ name: 'multiplier', label: 'Win Multiplier', description: 'Profit multiplier.', example: '2.0' },
		],
	},

	// ==========================================
	// Loyalty Games: Gambling Bonus Events
	// ==========================================
	'gambling.bonus_start': {
		id: 'gambling.bonus_start',
		name: 'Gambling Bonus Event Start Message',
		domain: 'gambling',
		description: 'Chat announcement sent when a Gambling Bonus event begins.',
		defaultTemplate: 'GAMBLING FRENZY! Win multiplier is boosted to $(multiplier)x with $(threshold)+ win rolls for the next $(duration) minutes! Each viewer gets $(tickets) bonus tickets!',
		variables: [
			{ name: 'duration', label: 'Bonus Duration (Minutes)', description: 'Event duration in minutes.', example: '5' },
			{ name: 'multiplier', label: 'Bonus Multiplier', description: 'Boosted net profit multiplier during the event.', example: '2.0' },
			{ name: 'threshold', label: 'Bonus Roll Threshold', description: 'Minimum roll needed to win during the bonus event.', example: '45' },
			{ name: 'tickets', label: 'Bonus Tickets Per User', description: 'Number of bonus rolls allocated per viewer.', example: '5' },
		],
	},
	'gambling.bonus_end': {
		id: 'gambling.bonus_end',
		name: 'Gambling Bonus Event End Message',
		domain: 'gambling',
		description: 'Chat announcement sent when a Gambling Bonus event concludes.',
		defaultTemplate: 'The Gambling Frenzy has ended! Odds and multipliers have returned to normal.',
		variables: [
			{ name: 'duration', label: 'Bonus Duration (Minutes)', description: 'Event duration in minutes.', example: '5' },
			{ name: 'multiplier', label: 'Bonus Multiplier', description: 'Boosted net profit multiplier.', example: '2.0' },
			{ name: 'threshold', label: 'Bonus Roll Threshold', description: 'Minimum roll needed.', example: '45' },
			{ name: 'tickets', label: 'Bonus Tickets Per User', description: 'Tickets count.', example: '5' },
		],
	},

	// ==========================================
	// Custom Commands
	// ==========================================
	'commands.custom': {
		id: 'commands.custom',
		name: 'Custom Chat Command',
		domain: 'commands',
		description: 'Custom command chat response template with positional arguments and counter variables.',
		defaultTemplate: '$(sender), you have $(points) $(core.currency)!',
		variables: [
			{ name: 'sender', label: 'Command Sender', description: 'Display name of the user who executed the command.', example: 'ViewerOne' },
			{ name: 'sender.name', label: 'Sender Username', description: 'Lowercase username of the command sender.', example: 'viewerone' },
			{ name: 'sender.id', label: 'Sender User ID', description: 'Twitch user ID of the command sender.', example: '12345678' },
			{ name: 'touser', label: 'Target User', description: 'Target user specified in command arguments (or sender if none).', example: 'FriendUser' },
			{ name: 'query', label: 'Full Query Arguments', description: 'All arguments passed after the command as a single string.', example: 'hello world' },
			{ name: '1', label: 'Argument 1', description: 'First positional argument passed to the command.', example: 'arg1' },
			{ name: '2', label: 'Argument 2', description: 'Second positional argument passed to the command.', example: 'arg2' },
			{ name: 'count', label: 'Persistent Counter', description: 'Increments and outputs a database counter ($(count) or $(count <name>)).', example: '1' },
		],
	},

	// ==========================================
	// Timers
	// ==========================================
	'timers.message': {
		id: 'timers.message',
		name: 'Periodic Timer Message',
		domain: 'timers',
		description: 'Scheduled message rotated periodically to Twitch chat.',
		defaultTemplate: 'Enjoying the stream? Make sure to hit follow and join our Discord!',
		variables: [],
	},

	// ==========================================
	// Widgets
	// ==========================================
	'widgets.deaths': {
		id: 'widgets.deaths',
		name: 'Death Counter Overlay',
		domain: 'widgets',
		description: 'Stream overlay text display template for death and game counters.',
		defaultTemplate: '$(game) Deaths: $(count)',
		variables: [
			{ name: 'game', label: 'Current Game Name', description: 'Name of the current active game.', example: 'Elden Ring' },
			{ name: 'counter', label: 'Active Counter Name', description: 'Name of the active counter category (e.g. DLC).', example: 'Default' },
			{ name: 'count', label: 'Active Counter Count', description: 'Death count for the active counter.', example: '14' },
			{ name: 'total', label: 'Total Game Deaths', description: 'Cumulative deaths across all counters for this game.', example: '32' },
		],
	},
}
