-- Server-side per-user per-stage attempt tracking.
--
-- Used by /api/progress/stage to derive the `firstTry` and `noHints`
-- bonuses server-side, eliminating the prior trust-the-client model
-- where the client could spoof both flags.
--
-- Idempotency: PRIMARY KEY on (user_id, mission_id, stage_id) — exactly
-- one row per (user, stage). On a stage claim, the server upserts this
-- row, accumulating attempts and hints used across retries.

CREATE TABLE `stage_attempts` (
  `user_id` text NOT NULL,
  `mission_id` text NOT NULL,
  `stage_id` text NOT NULL,
  `attempt_count` integer NOT NULL DEFAULT 0,
  `hints_used` integer NOT NULL DEFAULT 0,
  `completed_at` integer,
  `updated_at` integer NOT NULL,
  PRIMARY KEY (`user_id`, `mission_id`, `stage_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE INDEX `stage_attempts_user_idx` ON `stage_attempts` (`user_id`);