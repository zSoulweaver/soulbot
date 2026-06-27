export const STREAMER_OAUTH_VERSION = 4
export const BOT_OAUTH_VERSION = 1

export const STREAMER_OAUTH_SCOPES = [
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
	'user:manage:whispers',
]
