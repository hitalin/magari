ALTER TABLE `events` ADD `all_day` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `url` text;--> statement-breakpoint
ALTER TABLE `events` ADD `source` text;--> statement-breakpoint
ALTER TABLE `events` ADD `source_uid` text;--> statement-breakpoint
CREATE INDEX `events_source_idx` ON `events` (`source`,`starts_at`);