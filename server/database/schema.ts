import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

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
});
