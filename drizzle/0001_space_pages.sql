CREATE TABLE `inquiries` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`actor_id`) REFERENCES `actors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `inquiries_actor_idx` ON `inquiries` (`actor_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `posts` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`title` text NOT NULL,
	`body` text,
	`event_id` text,
	`status` text DEFAULT 'published' NOT NULL,
	`published_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`actor_id`) REFERENCES `actors`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `posts_actor_idx` ON `posts` (`actor_id`,`status`,`published_at`);--> statement-breakpoint
CREATE TABLE `space_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`name` text NOT NULL,
	`kind` text DEFAULT 'other' NOT NULL,
	`price_text` text,
	`description` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`actor_id`) REFERENCES `actors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `space_plans_actor_idx` ON `space_plans` (`actor_id`,`sort_order`);--> statement-breakpoint
ALTER TABLE `actors` ADD `catch` text;--> statement-breakpoint
ALTER TABLE `actors` ADD `body` text;--> statement-breakpoint
ALTER TABLE `actors` ADD `facilities` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `actors` ADD `hours` text;--> statement-breakpoint
ALTER TABLE `actors` ADD `closed_days` text;--> statement-breakpoint
ALTER TABLE `actors` ADD `access` text;--> statement-breakpoint
ALTER TABLE `actors` ADD `operator` text;--> statement-breakpoint
ALTER TABLE `actors` ADD `instagram` text;--> statement-breakpoint
ALTER TABLE `actors` ADD `links` text DEFAULT '[]' NOT NULL;