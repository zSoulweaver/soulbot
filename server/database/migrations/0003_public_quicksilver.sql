ALTER TABLE `commands` ADD `allow_whisper` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `commands` ADD `whisper_silent_response` integer DEFAULT false NOT NULL;