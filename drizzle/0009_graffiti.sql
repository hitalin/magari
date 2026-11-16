CREATE TABLE `graffiti` (
	`id` text PRIMARY KEY NOT NULL,
	`d` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `graffiti_created_idx` ON `graffiti` (`created_at`);