import { sql } from 'drizzle-orm'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const twitchTokens = sqliteTable('twitch_tokens', {
	accountType: text('account_type').primaryKey(), // 'bot' | 'streamer'
	userId: text('user_id'),
	userName: text('user_name'),
	displayName: text('display_name'),
	accessToken: text('access_token').notNull(),
	refreshToken: text('refresh_token').notNull(),
	expiresIn: integer('expires_in'),
	obtainmentTimestamp: integer('obtainment_timestamp').notNull(),
	scope: text('scope').notNull(), // Store as JSON stringified array or comma separated
})

export const spotifyTokens = sqliteTable('spotify_tokens', {
	id: text('id').primaryKey(), // 'streamer'
	accessToken: text('access_token').notNull(),
	refreshToken: text('refresh_token').notNull(),
	expiresIn: integer('expires_in'),
	obtainmentTimestamp: integer('obtainment_timestamp').notNull(),
	scope: text('scope').notNull(),
})

export const commands = sqliteTable('commands', {
	id: text('id').primaryKey(), // internal code handler ID
	trigger: text('trigger').unique(), // current trigger word
	enabled: integer('enabled', { mode: 'boolean' }).default(true).notNull(),
	cost: integer('cost').default(0).notNull(),
	cooldown: integer('cooldown').default(0).notNull(), // in seconds (legacy fallback)
	globalCooldown: integer('global_cooldown').default(0).notNull(), // global command cooldown in seconds
	userCooldown: integer('user_cooldown').default(0).notNull(), // user command cooldown in seconds
	permission: text('permission'), // custom permission override
	allowWhisper: integer('allow_whisper', { mode: 'boolean' }).default(false).notNull(),
	whisperSilentResponse: integer('whisper_silent_response', { mode: 'boolean' }).default(false).notNull(),
})

export const commandAliases = sqliteTable('command_aliases', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	trigger: text('trigger').notNull().unique(),
	commandId: text('command_id').notNull().references(() => commands.id),
	subcommand: text('subcommand'),
	overrideArgs: text('override_args', { mode: 'json' }).$type<string[]>(),
})

export const users = sqliteTable('users', {
	id: text('id').primaryKey(), // twitch user id
	username: text('username').notNull(),
	displayName: text('display_name').notNull(),
	image: text('image'),
	role: text('role').$type<'viewer' | 'moderator' | 'admin' | 'caster'>().default('viewer').notNull(),
	isVip: integer('is_vip', { mode: 'boolean' }).default(false).notNull(),
	isSubscriber: integer('is_subscriber', { mode: 'boolean' }).default(false).notNull(),
	points: integer('points').default(0).notNull(),
	watchTime: integer('watch_time').default(0).notNull(),
	gambleWins: integer('gamble_wins').default(0).notNull(),
	gambleLosses: integer('gamble_losses').default(0).notNull(),
	gambleNetPoints: integer('gamble_net_points').default(0).notNull(),
	firstSeen: integer('first_seen'), // Null if never seen in chat
	lastSeen: integer('last_seen'),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
})

export const commandTemplates = sqliteTable('command_templates', {
	id: text('id').primaryKey(), // e.g. 'points.add'
	template: text('template').notNull(), // The user-defined override string
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const settings = sqliteTable('settings', {
	key: text('key').primaryKey(),
	value: text('value').notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
})

export const excludedUsers = sqliteTable('excluded_users', {
	id: text('id').primaryKey(), // Twitch user ID
	username: text('username').notNull().unique(), // Twitch username (stored in lowercase for easy match/lookup)
	displayName: text('display_name').notNull(), // Capitalized Twitch display name
	reason: text('reason'), // Optional note/reason for exclusion (e.g. "System Bot")
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
})

export const customCommands = sqliteTable('custom_commands', {
	id: text('id').primaryKey(), // Unique command ID
	trigger: text('trigger').notNull().unique(), // E.g. "deaths" or "wins"
	response: text('response').notNull(), // E.g. "$(sender) has $(count) deaths!"
	enabled: integer('enabled', { mode: 'boolean' }).default(true).notNull(),
	cost: integer('cost').default(0).notNull(),
	globalCooldown: integer('global_cooldown').default(0).notNull(),
	userCooldown: integer('user_cooldown').default(0).notNull(),
	permission: text('permission').default('everyone').notNull(), // 'everyone' | 'subscriber' | 'vip' | 'moderator' | 'broadcaster'
	description: text('description'),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
})

export const counters = sqliteTable('counters', {
	name: text('name').primaryKey(), // E.g. "deaths" or custom name
	value: integer('value').notNull().default(0),
})

export const gameDeaths = sqliteTable('game_deaths', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	gameName: text('game_name').notNull().unique(),
	twitchGameId: text('twitch_game_id'),
	boxArtUrl: text('box_art_url'),
	deaths: integer('deaths').notNull().default(0),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
})

export interface WidgetStyles {
	fontFamily?: string
	fontSize?: number
	fontWeight?: string
	color?: string
	backgroundColor?: string
	textAlign?: string
	customCss?: string
}

export const widgets = sqliteTable('widgets', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	enabled: integer('enabled', { mode: 'boolean' }).default(true).notNull(),
	template: text('template').notNull(),
	styles: text('styles', { mode: 'json' }).$type<WidgetStyles>().notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
})

export interface TimerMessage {
	text: string
	enabled: boolean
}

export const timers = sqliteTable('timers', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	enabled: integer('enabled', { mode: 'boolean' }).default(true).notNull(),
	messages: text('messages', { mode: 'json' }).$type<TimerMessage[]>().notNull(),
	lastSentIndex: integer('last_sent_index').default(0).notNull(),
	intervalOnline: integer('interval_online').default(10).notNull(),
	intervalOffline: integer('interval_offline').default(30).notNull(),
	minMessages: integer('min_messages').default(0).notNull(),
	lastTriggeredAt: integer('last_triggered_at', { mode: 'timestamp' }),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
})

export const spotifyQueue = sqliteTable('spotify_queue', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	trackId: text('track_id').notNull(),
	title: text('title').notNull(),
	artist: text('artist').notNull(),
	durationMs: integer('duration_ms').notNull(),
	albumArt: text('album_art'),
	requestedBy: text('requested_by').notNull(),
	pointsCost: integer('points_cost').notNull().default(0),
	playedAt: integer('played_at'),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
	status: text('status').$type<'pending' | 'queued' | 'playing' | 'played' | 'removed'>().default('pending').notNull(),
})

export const spotifyPlaylistCache = sqliteTable('spotify_playlist_cache', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	playlistId: text('playlist_id').notNull(),
	trackId: text('track_id').notNull(),
	uri: text('uri').notNull(),
	title: text('title').notNull(),
	artist: text('artist').notNull(),
	durationMs: integer('duration_ms').notNull(),
	albumArt: text('album_art'),
})

export const spotifyBlacklist = sqliteTable('spotify_blacklist', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	trackId: text('track_id').notNull().unique(),
	title: text('title').notNull(),
	artist: text('artist').notNull(),
	albumArt: text('album_art'),
	addedBy: text('added_by').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
})

export const eventsLog = sqliteTable('events_log', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	type: text('type').notNull(), // 'follow' | 'subscription' | 'gift' | 'cheer'
	userName: text('user_name').notNull(),
	displayName: text('display_name').notNull(),
	metadata: text('metadata', { mode: 'json' }).$type<{
		tier?: string
		giftCount?: number
		bitsCount?: number
		cheerMessage?: string
	}>(),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
})
