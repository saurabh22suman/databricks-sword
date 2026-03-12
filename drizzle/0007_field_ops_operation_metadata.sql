CREATE TABLE `field_ops_operations` (
  `id` text PRIMARY KEY NOT NULL,
  `deployment_id` text NOT NULL,
  `user_id` text NOT NULL,
  `operation_type` text NOT NULL,
  `state` text NOT NULL DEFAULT 'started',
  `request_id` text NOT NULL,
  `idempotency_key` text NOT NULL,
  `correlation_id` text NOT NULL,
  `started_at` integer NOT NULL,
  `completed_at` integer,
  `duration_ms` integer,
  `failure_class` text,
  `failure_code` text,
  `failure_message` text,
  `attempt_count` integer NOT NULL DEFAULT 1,
  `retry_count` integer NOT NULL DEFAULT 0,
  `estimated_cost_units` integer NOT NULL DEFAULT 0,
  `metadata` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`deployment_id`) REFERENCES `field_ops_deployments`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX `field_ops_operations_operation_idempotency_unique`
  ON `field_ops_operations` (`deployment_id`, `operation_type`, `idempotency_key`);

CREATE INDEX `field_ops_operations_deployment_type_state_idx`
  ON `field_ops_operations` (`deployment_id`, `operation_type`, `state`, `started_at`);

CREATE INDEX `field_ops_operations_user_started_idx`
  ON `field_ops_operations` (`user_id`, `started_at`);

CREATE INDEX `field_ops_operations_started_at_idx`
  ON `field_ops_operations` (`started_at`);

CREATE INDEX `field_ops_operations_active_operation_lock_idx`
  ON `field_ops_operations` (`deployment_id`)
  WHERE `state` = 'started';
