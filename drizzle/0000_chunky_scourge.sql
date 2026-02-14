CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text,
	`email_verified` integer,
	`name` text,
	`image` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
--> statement-breakpoint
CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`provider` text NOT NULL,
	`provider_account_id` text NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`expires_at` integer,
	`token_type` text,
	`scope` text,
	`id_token` text,
	`session_state` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`session_token` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `verification_tokens` (
	`identifier` text NOT NULL,
	`token` text NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `verification_tokens_token_unique` ON `verification_tokens` (`token`);
--> statement-breakpoint
CREATE TABLE `flashcard_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`flashcard_id` text NOT NULL,
	`ease` integer DEFAULT 250 NOT NULL,
	`interval` integer DEFAULT 0 NOT NULL,
	`repetitions` integer DEFAULT 0 NOT NULL,
	`next_review_at` integer,
	`last_reviewed_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sandbox_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`snapshot_data` text NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sandbox_snapshots_user_id_unique` ON `sandbox_snapshots` (`user_id`);
--> statement-breakpoint
CREATE TABLE `databricks_connections` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`workspace_url` text NOT NULL,
	`encrypted_pat` text NOT NULL,
	`pat_expires_at` integer,
	`connected_at` integer NOT NULL,
	`last_validated_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
