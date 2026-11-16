UPDATE `events` SET `status` = 'draft', `visibility` = 'public' WHERE `visibility` = 'private';--> statement-breakpoint
ALTER TABLE `events` DROP COLUMN `capacity`;--> statement-breakpoint
ALTER TABLE `events` DROP COLUMN `tags`;