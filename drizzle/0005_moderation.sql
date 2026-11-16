CREATE TABLE `blocked_handles` (
	`handle` text PRIMARY KEY NOT NULL,
	`note` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`about` text,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `reports_created_idx` ON `reports` (`created_at`);