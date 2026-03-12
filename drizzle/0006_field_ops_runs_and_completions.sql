ALTER TABLE `field_ops_validations` ADD `run_id` text;
ALTER TABLE `field_ops_validations` ADD `check_key` text;

UPDATE `field_ops_validations`
SET
  `run_id` = COALESCE(`run_id`, `id`),
  `check_key` = COALESCE(`check_key`, lower(replace(`check_name`, ' ', '_')));

CREATE INDEX `field_ops_validations_deployment_run_idx`
  ON `field_ops_validations` (`deployment_id`, `run_id`);

CREATE INDEX `field_ops_validations_deployment_run_check_idx`
  ON `field_ops_validations` (`deployment_id`, `run_id`, `check_key`);

CREATE TABLE `field_ops_completions` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `deployment_id` text NOT NULL,
  `industry` text NOT NULL,
  `xp_awarded` integer NOT NULL,
  `completed_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`deployment_id`) REFERENCES `field_ops_deployments`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX `field_ops_completions_user_industry_unique`
  ON `field_ops_completions` (`user_id`, `industry`);
