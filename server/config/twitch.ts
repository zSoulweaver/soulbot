export const STREAMER_OAUTH_VERSION = 3

export const STREAMER_OAUTH_SCOPES = [
	'chat:read',
	'chat:edit',
	'channel:moderate',
	'moderation:read',
	'channel:read:subscriptions',
	'channel:manage:broadcast',
	'moderator:read:chatters',
	'moderator:read:followers', // For following EventSub websocket
	'bits:read', // For cheer/bits EventSub websocket
]

export const BOT_OAUTH_SCOPES = [
	'chat:read',
	'chat:edit',
	'whispers:read',
	'whispers:edit',
]
