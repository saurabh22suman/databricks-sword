-- Field Operations tables migration
-- Created: 2026-02-16

CREATE TABLE `field_ops_deployments` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `industry` text NOT NULL,
  `status` text DEFAULT 'pending' NOT NULL,
  `catalog_name` text DEFAULT 'default' NOT NULL,
  `schema_prefix` text NOT NULL,
  `warehouse_id` text,
  `workspace_url` text,
  `bundle_path` text,
  `deployed_at` integer,
  `validated_at` integer,
  `completed_at` integer,
  `cleaned_up_at` integer,
  `error_message` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `field_ops_validations` (
  `id` text PRIMARY KEY NOT NULL,
  `deployment_id` text NOT NULL,
  `check_name` text NOT NULL,
  `query` text NOT NULL,
  `passed` integer NOT NULL,
  `executed_at` integer NOT NULL,
  `error_message` text,
  FOREIGN KEY (`deployment_id`) REFERENCES `field_ops_deployments`(`id`) ON UPDATE no action ON DELETE cascade
);
