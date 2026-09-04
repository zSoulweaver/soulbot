-- Migrate templates from settings to general_templates
INSERT INTO general_templates (id, template, updated_at)
SELECT 'discord.events.join', value, updated_at FROM settings WHERE key = 'discord.events.join.template'
ON CONFLICT(id) DO UPDATE SET template = excluded.template;
--> statement-breakpoint
INSERT INTO general_templates (id, template, updated_at)
SELECT 'discord.events.leave', value, updated_at FROM settings WHERE key = 'discord.events.leave.template'
ON CONFLICT(id) DO UPDATE SET template = excluded.template;
--> statement-breakpoint
INSERT INTO general_templates (id, template, updated_at)
SELECT 'discord.alert.follow', value, updated_at FROM settings WHERE key = 'discord.alerts.follow.template'
ON CONFLICT(id) DO UPDATE SET template = excluded.template;
--> statement-breakpoint
INSERT INTO general_templates (id, template, updated_at)
SELECT 'discord.alert.sub', value, updated_at FROM settings WHERE key = 'discord.alerts.sub.template'
ON CONFLICT(id) DO UPDATE SET template = excluded.template;
--> statement-breakpoint
INSERT INTO general_templates (id, template, updated_at)
SELECT 'discord.alert.gift', value, updated_at FROM settings WHERE key = 'discord.alerts.gift.template'
ON CONFLICT(id) DO UPDATE SET template = excluded.template;
--> statement-breakpoint
INSERT INTO general_templates (id, template, updated_at)
SELECT 'discord.alert.cheer', value, updated_at FROM settings WHERE key = 'discord.alerts.cheer.template'
ON CONFLICT(id) DO UPDATE SET template = excluded.template;
--> statement-breakpoint
INSERT INTO general_templates (id, template, updated_at)
SELECT 'discord.alert.raid', value, updated_at FROM settings WHERE key = 'discord.alerts.raid.template'
ON CONFLICT(id) DO UPDATE SET template = excluded.template;
--> statement-breakpoint
INSERT INTO general_templates (id, template, updated_at)
SELECT 'discord.alert.live', value, updated_at FROM settings WHERE key = 'discord.alerts.live.template'
ON CONFLICT(id) DO UPDATE SET template = excluded.template;
--> statement-breakpoint
INSERT INTO general_templates (id, template, updated_at)
SELECT 'discord.alert.offline', value, updated_at FROM settings WHERE key = 'discord.alerts.offline.template'
ON CONFLICT(id) DO UPDATE SET template = excluded.template;
--> statement-breakpoint
INSERT INTO general_templates (id, template, updated_at)
SELECT 'discord.alert.ban', value, updated_at FROM settings WHERE key = 'discord.alerts.ban.template'
ON CONFLICT(id) DO UPDATE SET template = excluded.template;
--> statement-breakpoint
INSERT INTO general_templates (id, template, updated_at)
SELECT 'discord.alert.timeout', value, updated_at FROM settings WHERE key = 'discord.alerts.timeout.template'
ON CONFLICT(id) DO UPDATE SET template = excluded.template;
--> statement-breakpoint
INSERT INTO general_templates (id, template, updated_at)
SELECT 'discord.alert.unban', value, updated_at FROM settings WHERE key = 'discord.alerts.unban.template'
ON CONFLICT(id) DO UPDATE SET template = excluded.template;
--> statement-breakpoint
INSERT INTO general_templates (id, template, updated_at)
SELECT 'discord.alert.message_delete', value, updated_at FROM settings WHERE key = 'discord.alerts.message_delete.template'
ON CONFLICT(id) DO UPDATE SET template = excluded.template;
--> statement-breakpoint
INSERT INTO general_templates (id, template, updated_at)
SELECT 'eventsub.alert.follow', value, updated_at FROM settings WHERE key = 'eventsub.alert.follow'
ON CONFLICT(id) DO UPDATE SET template = excluded.template;
--> statement-breakpoint
INSERT INTO general_templates (id, template, updated_at)
SELECT 'eventsub.alert.sub', value, updated_at FROM settings WHERE key = 'eventsub.alert.sub'
ON CONFLICT(id) DO UPDATE SET template = excluded.template;
--> statement-breakpoint
INSERT INTO general_templates (id, template, updated_at)
SELECT 'eventsub.alert.gift', value, updated_at FROM settings WHERE key = 'eventsub.alert.gift' OR key = 'eventsub.alert.subgift'
ON CONFLICT(id) DO UPDATE SET template = excluded.template;
--> statement-breakpoint
INSERT INTO general_templates (id, template, updated_at)
SELECT 'eventsub.alert.cheer', value, updated_at FROM settings WHERE key = 'eventsub.alert.cheer'
ON CONFLICT(id) DO UPDATE SET template = excluded.template;
--> statement-breakpoint
INSERT INTO general_templates (id, template, updated_at)
SELECT 'eventsub.alert.raid', value, updated_at FROM settings WHERE key = 'eventsub.alert.raid'
ON CONFLICT(id) DO UPDATE SET template = excluded.template;
--> statement-breakpoint
INSERT INTO general_templates (id, template, updated_at)
SELECT 'eventsub.alert.live', value, updated_at FROM settings WHERE key = 'eventsub.alert.live'
ON CONFLICT(id) DO UPDATE SET template = excluded.template;
--> statement-breakpoint
INSERT INTO general_templates (id, template, updated_at)
SELECT 'eventsub.alert.offline', value, updated_at FROM settings WHERE key = 'eventsub.alert.offline'
ON CONFLICT(id) DO UPDATE SET template = excluded.template;
--> statement-breakpoint
INSERT INTO general_templates (id, template, updated_at)
SELECT 'eventsub.alert.ban', value, updated_at FROM settings WHERE key = 'eventsub.alert.ban'
ON CONFLICT(id) DO UPDATE SET template = excluded.template;
--> statement-breakpoint
INSERT INTO general_templates (id, template, updated_at)
SELECT 'eventsub.alert.timeout', value, updated_at FROM settings WHERE key = 'eventsub.alert.timeout'
ON CONFLICT(id) DO UPDATE SET template = excluded.template;
--> statement-breakpoint
INSERT INTO general_templates (id, template, updated_at)
SELECT 'eventsub.alert.unban', value, updated_at FROM settings WHERE key = 'eventsub.alert.unban'
ON CONFLICT(id) DO UPDATE SET template = excluded.template;
--> statement-breakpoint
INSERT INTO general_templates (id, template, updated_at)
SELECT 'eventsub.alert.message_delete', value, updated_at FROM settings WHERE key = 'eventsub.alert.message_delete' OR key = 'eventsub.alert.messagedelete'
ON CONFLICT(id) DO UPDATE SET template = excluded.template;
--> statement-breakpoint
INSERT INTO general_templates (id, template, updated_at)
SELECT 'eventsub.alert.adbreak', value, updated_at FROM settings WHERE key = 'eventsub.alert.adbreak'
ON CONFLICT(id) DO UPDATE SET template = excluded.template;
--> statement-breakpoint
INSERT INTO general_templates (id, template, updated_at)
SELECT 'ads.alert', value, updated_at FROM settings WHERE key = 'ads.alerts.template'
ON CONFLICT(id) DO UPDATE SET template = excluded.template;
--> statement-breakpoint
INSERT INTO general_templates (id, template, updated_at)
SELECT 'gambling.bonus_start', value, updated_at FROM settings WHERE key = 'points.gambling.bonus_message'
ON CONFLICT(id) DO UPDATE SET template = excluded.template;
--> statement-breakpoint
INSERT INTO general_templates (id, template, updated_at)
SELECT 'gambling.bonus_end', value, updated_at FROM settings WHERE key = 'points.gambling.bonus_end_message'
ON CONFLICT(id) DO UPDATE SET template = excluded.template;
--> statement-breakpoint
INSERT INTO general_templates (id, template, updated_at)
SELECT 'vault.start', value, updated_at FROM settings WHERE key = 'points.vault.start_message'
ON CONFLICT(id) DO UPDATE SET template = excluded.template;
--> statement-breakpoint
INSERT INTO general_templates (id, template, updated_at)
SELECT 'vault.warning', value, updated_at FROM settings WHERE key = 'points.vault.warning_message'
ON CONFLICT(id) DO UPDATE SET template = excluded.template;
--> statement-breakpoint
INSERT INTO general_templates (id, template, updated_at)
SELECT 'vault.win', value, updated_at FROM settings WHERE key = 'points.vault.end_win_message'
ON CONFLICT(id) DO UPDATE SET template = excluded.template;
--> statement-breakpoint
INSERT INTO general_templates (id, template, updated_at)
SELECT 'vault.lose', value, updated_at FROM settings WHERE key = 'points.vault.end_lose_message'
ON CONFLICT(id) DO UPDATE SET template = excluded.template;
--> statement-breakpoint
DELETE FROM settings WHERE key IN (
	'discord.events.join.template',
	'discord.events.leave.template',
	'discord.alerts.follow.template',
	'discord.alerts.sub.template',
	'discord.alerts.gift.template',
	'discord.alerts.cheer.template',
	'discord.alerts.raid.template',
	'discord.alerts.live.template',
	'discord.alerts.offline.template',
	'discord.alerts.ban.template',
	'discord.alerts.timeout.template',
	'discord.alerts.unban.template',
	'discord.alerts.message_delete.template',
	'eventsub.alert.follow',
	'eventsub.alert.sub',
	'eventsub.alert.gift',
	'eventsub.alert.subgift',
	'eventsub.alert.cheer',
	'eventsub.alert.raid',
	'eventsub.alert.live',
	'eventsub.alert.offline',
	'eventsub.alert.ban',
	'eventsub.alert.timeout',
	'eventsub.alert.unban',
	'eventsub.alert.message_delete',
	'eventsub.alert.messagedelete',
	'eventsub.alert.adbreak',
	'ads.alerts.template',
	'points.gambling.bonus_message',
	'points.gambling.bonus_end_message',
	'points.vault.start_message',
	'points.vault.warning_message',
	'points.vault.end_win_message',
	'points.vault.end_lose_message'
);