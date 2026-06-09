CREATE TABLE `file_metadata` (
	`path` text PRIMARY KEY NOT NULL,
	`is_nsfw` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
