CREATE TABLE `game_deaths` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_name` text NOT NULL,
	`deaths` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `game_deaths_game_name_unique` ON `game_deaths` (`game_name`);