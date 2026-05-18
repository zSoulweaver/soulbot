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

export const commands = sqliteTable('commands', {
	id: text('id').primaryKey(), // internal code handler ID
	trigger: text('trigger').notNull().unique(), // current trigger word
	enabled: integer('enabled', { mode: 'boolean' }).default(true).notNull(),
	cost: integer('cost').default(0).notNull(),
	cooldown: integer('cooldown').default(0).notNull(), // in seconds (legacy fallback)
	globalCooldown: integer('global_cooldown').default(0).notNull(), // global command cooldown in seconds
	userCooldown: integer('user_cooldown').default(0).notNull(), // user command cooldown in seconds
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
	role: text('role').$type<'viewer' | 'moderator' | 'caster'>().default('viewer').notNull(),
	isVip: integer('is_vip', { mode: 'boolean' }).default(false).notNull(),
	isSubscriber: integer('is_subscriber', { mode: 'boolean' }).default(false).notNull(),
	points: integer('points').default(0).notNull(),
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
