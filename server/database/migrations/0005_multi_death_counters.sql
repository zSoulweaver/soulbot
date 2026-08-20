CREATE TABLE `game_death_counters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_id` integer NOT NULL,
	`name` text NOT NULL,
	`deaths` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `games` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`twitch_game_id` text,
	`box_art_url` text,
	`active_death_counter_id` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `games_name_unique` ON `games` (`name`);--> statement-breakpoint
INSERT INTO `games` (`id`, `name`, `twitch_game_id`, `box_art_url`, `created_at`, `updated_at`)
SELECT `id`, `game_name`, `twitch_game_id`, `box_art_url`, `created_at`, `updated_at`
FROM `game_deaths`;--> statement-breakpoint
INSERT INTO `game_death_counters` (`game_id`, `name`, `deaths`, `created_at`, `updated_at`)
SELECT `id`, 'Default', `deaths`, `created_at`, `updated_at`
FROM `game_deaths`;--> statement-breakpoint
UPDATE `games`
SET `active_death_counter_id` = (
	SELECT `id` FROM `game_death_counters`
	WHERE `game_death_counters`.`game_id` = `games`.`id`
	LIMIT 1
);--> statement-breakpoint
DROP TABLE `game_deaths`;