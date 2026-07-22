export const STREAMER_OAUTH_VERSION = 8
export const BOT_OAUTH_VERSION = 1

export const STREAMER_OAUTH_SCOPES = [
	'channel:moderate',
	'moderation:read',
	'channel:read:subscriptions',
	'channel:manage:broadcast',
	'moderator:read:chatters',
	'moderator:read:followers',
	'moderator:read:blocked_terms',
	'moderator:read:chat_settings',
	'moderator:read:unban_requests',
	'moderator:read:banned_users',
	'moderator:read:chat_messages',
	'moderator:read:warnings',
	'moderator:read:moderators',
	'moderator:read:vips',
	'bits:read', // For cheer/bits EventSub websocket
	'channel:read:vips',
	'channel:manage:vips',
	'channel:read:ads',
	'channel:manage:ads',
	'channel:edit:commercial',
]

export const BOT_OAUTH_SCOPES = [
	'chat:read',
	'chat:edit',
	'user:manage:whispers',
]
