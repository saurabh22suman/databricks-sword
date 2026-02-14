CREATE TABLE `blog_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`content` text NOT NULL,
	`author` text DEFAULT 'Databricks Sword' NOT NULL,
	`category` text NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`source_url` text,
	`citations` text DEFAULT '[]',
	`featured` integer DEFAULT false NOT NULL,
	`published_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `blog_posts_slug_unique` ON `blog_posts` (`slug`);
--> statement-breakpoint
CREATE TABLE `faq_items` (
	`id` text PRIMARY KEY NOT NULL,
	`category` text NOT NULL,
	`question` text NOT NULL,
	`answer` text NOT NULL,
	`code_example` text,
	`key_points` text DEFAULT '[]',
	`display_order` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
