ALTER TABLE `actors` ADD `hidden_at` integer;--> statement-breakpoint
ALTER TABLE `events` ADD `hidden_at` integer;--> statement-breakpoint
ALTER TABLE `reports` ADD `contact` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `reports` ADD `handled_at` integer;--> statement-breakpoint
ALTER TABLE `reports` ADD `note` text;--> statement-breakpoint
UPDATE `reports` SET `contact` = `email`;
