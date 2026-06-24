CREATE TABLE `command_aliases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`trigger` text NOT NULL,
	`command_id` text NOT NULL,
	`subcommand` text,
	`override_args` text,
	FOREIGN KEY (`command_id`) REFERENCES `commands`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `command_aliases_trigger_unique` ON `command_aliases` (`trigger`);--> statement-breakpoint
CREATE TABLE `command_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`template` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `commands` (
	`id` text PRIMARY KEY NOT NULL,
	`trigger` text,
	`enabled` integer DEFAULT true NOT NULL,
	`cost` integer DEFAULT 0 NOT NULL,
	`cooldown` integer DEFAULT 0 NOT NULL,
	`global_cooldown` integer DEFAULT 0 NOT NULL,
	`user_cooldown` integer DEFAULT 0 NOT NULL,
	`permission` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `commands_trigger_unique` ON `commands` (`trigger`);--> statement-breakpoint
CREATE TABLE `counters` (
	`name` text PRIMARY KEY NOT NULL,
	`value` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `custom_commands` (
	`id` text PRIMARY KEY NOT NULL,
	`trigger` text NOT NULL,
	`response` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`cost` integer DEFAULT 0 NOT NULL,
	`global_cooldown` integer DEFAULT 0 NOT NULL,
	`user_cooldown` integer DEFAULT 0 NOT NULL,
	`permission` text DEFAULT 'everyone' NOT NULL,
	`description` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `custom_commands_trigger_unique` ON `custom_commands` (`trigger`);--> statement-breakpoint
CREATE TABLE `events_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`user_name` text NOT NULL,
	`display_name` text NOT NULL,
	`metadata` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `excluded_users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`display_name` text NOT NULL,
	`reason` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `excluded_users_username_unique` ON `excluded_users` (`username`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `spotify_blacklist` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`track_id` text NOT NULL,
	`title` text NOT NULL,
	`artist` text NOT NULL,
	`album_art` text,
	`added_by` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `spotify_blacklist_track_id_unique` ON `spotify_blacklist` (`track_id`);--> statement-breakpoint
CREATE TABLE `spotify_playlist_cache` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`playlist_id` text NOT NULL,
	`track_id` text NOT NULL,
	`uri` text NOT NULL,
	`title` text NOT NULL,
	`artist` text NOT NULL,
	`duration_ms` integer NOT NULL,
	`album_art` text
);
--> statement-breakpoint
CREATE TABLE `spotify_queue` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`track_id` text NOT NULL,
	`title` text NOT NULL,
	`artist` text NOT NULL,
	`duration_ms` integer NOT NULL,
	`album_art` text,
	`requested_by` text NOT NULL,
	`points_cost` integer DEFAULT 0 NOT NULL,
	`played_at` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `spotify_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`access_token` text NOT NULL,
	`refresh_token` text NOT NULL,
	`expires_in` integer,
	`obtainment_timestamp` integer NOT NULL,
	`scope` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `timers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`messages` text NOT NULL,
	`last_sent_index` integer DEFAULT 0 NOT NULL,
	`interval_online` integer DEFAULT 10 NOT NULL,
	`interval_offline` integer DEFAULT 30 NOT NULL,
	`min_messages` integer DEFAULT 0 NOT NULL,
	`last_triggered_at` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `twitch_tokens` (
	`account_type` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`user_name` text,
	`display_name` text,
	`access_token` text NOT NULL,
	`refresh_token` text NOT NULL,
	`expires_in` integer,
	`obtainment_timestamp` integer NOT NULL,
	`scope` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`display_name` text NOT NULL,
	`image` text,
	`role` text DEFAULT 'viewer' NOT NULL,
	`is_vip` integer DEFAULT false NOT NULL,
	`is_subscriber` integer DEFAULT false NOT NULL,
	`points` integer DEFAULT 0 NOT NULL,
	`watch_time` integer DEFAULT 0 NOT NULL,
	`gamble_wins` integer DEFAULT 0 NOT NULL,
	`gamble_losses` integer DEFAULT 0 NOT NULL,
	`gamble_net_points` integer DEFAULT 0 NOT NULL,
	`first_seen` integer,
	`last_seen` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
