ALTER TABLE `events` ADD `area` text;--> statement-breakpoint
CREATE INDEX `events_area_idx` ON `events` (`area`,`starts_at`);