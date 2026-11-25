DROP INDEX `graffiti_created_idx`;--> statement-breakpoint
ALTER TABLE `graffiti` ADD `wall` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `graffiti_wall_idx` ON `graffiti` (`wall`,`created_at`);--> statement-breakpoint
CREATE INDEX `graffiti_paint_idx` ON `graffiti` (`wall`) WHERE d = 'x';--> statement-breakpoint
ALTER TABLE `actors` ADD `wall_open` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `wall_open` integer DEFAULT false NOT NULL;