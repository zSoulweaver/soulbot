-- Normalize legacy settings keys to standardized namespace formats
UPDATE settings SET key = 'points.gambling.min_bet' WHERE key = 'points.gambling_min_bet';
--> statement-breakpoint
UPDATE settings SET key = 'points.gambling.max_bet' WHERE key = 'points.gambling_max_bet';
--> statement-breakpoint
UPDATE settings SET key = 'points.gambling.win_min_roll' WHERE key = 'points.gambling_win_min_roll';
--> statement-breakpoint
UPDATE settings SET key = 'points.gambling.win_multiplier' WHERE key = 'points.gambling_win_multiplier';
--> statement-breakpoint
UPDATE settings SET key = 'points.gambling.bonus_duration' WHERE key = 'points.gambling_bonus_duration';
--> statement-breakpoint
UPDATE settings SET key = 'points.gambling.bonus_win_multiplier' WHERE key = 'points.gambling_bonus_win_multiplier';
--> statement-breakpoint
UPDATE settings SET key = 'points.gambling.bonus_win_min_roll' WHERE key = 'points.gambling_bonus_win_min_roll';
--> statement-breakpoint
UPDATE settings SET key = 'points.gambling.bonus_tickets_per_user' WHERE key = 'points.gambling_bonus_tickets_per_user';
--> statement-breakpoint
UPDATE settings SET key = 'points.gambling.bonus_message' WHERE key = 'points.gambling_bonus_message';
--> statement-breakpoint
UPDATE settings SET key = 'points.gambling.bonus_end_message' WHERE key = 'points.gambling_bonus_end_message';
--> statement-breakpoint
UPDATE settings SET key = 'points.gambling.bonus_end_time' WHERE key = 'points.gambling_bonus_end_time';
--> statement-breakpoint
UPDATE settings SET key = 'points.vault.min_bet' WHERE key = 'points.vault_min_bet';
--> statement-breakpoint
UPDATE settings SET key = 'points.vault.max_bet' WHERE key = 'points.vault_max_bet';
--> statement-breakpoint
UPDATE settings SET key = 'points.vault.win_min_roll' WHERE key = 'points.vault_win_min_roll';
--> statement-breakpoint
UPDATE settings SET key = 'points.vault.win_multiplier' WHERE key = 'points.vault_win_multiplier';
--> statement-breakpoint
UPDATE settings SET key = 'points.vault.duration' WHERE key = 'points.vault_duration';
--> statement-breakpoint
UPDATE settings SET key = 'points.vault.warning_enabled' WHERE key = 'points.vault_warning_enabled';
--> statement-breakpoint
UPDATE settings SET key = 'points.vault.end_time' WHERE key = 'points.vault_end_time';
--> statement-breakpoint
UPDATE settings SET key = 'points.vault.start_message' WHERE key = 'points.vault_start_message';
--> statement-breakpoint
UPDATE settings SET key = 'points.vault.warning_message' WHERE key = 'points.vault_warning_message';
--> statement-breakpoint
UPDATE settings SET key = 'points.vault.end_win_message' WHERE key = 'points.vault_end_win_message';
--> statement-breakpoint
UPDATE settings SET key = 'points.vault.end_lose_message' WHERE key = 'points.vault_end_lose_message';