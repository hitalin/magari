CREATE TABLE `host_moderations` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_actor_id` text NOT NULL,
	`sealed` text NOT NULL,
	`author_user_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`owner_actor_id`) REFERENCES `actors`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `host_moderations_owner_idx` ON `host_moderations` (`owner_actor_id`,`created_at`);