-- Authoritative server-side XP ledger.
--
-- The progress claim endpoints (/api/progress/*) insert one row per
-- (user, source) after validating the claim against mission/challenge
-- content config. /api/user/sync recomputes the user's totalXp,
-- streak, and achievement unlocks from this table — sandbox values
-- pushed from the client are no longer trusted.
--
-- The unique index on (user_id, source_type, source_id) makes awards
-- idempotent: retries and double-clicks no-op instead of double-awarding.
-- The (user_id, awarded_at) index speeds up streak recomputation and
-- "all awards for user" reads.

CREATE TABLE `xp_awards` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `source_type` text NOT NULL,
  `source_id` text NOT NULL,
  `xp_amount` integer NOT NULL,
  `multiplier` integer DEFAULT 100 NOT NULL,
  `awarded_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX `xp_awards_user_source_unique`
  ON `xp_awards` (`user_id`, `source_type`, `source_id`);

CREATE INDEX `xp_awards_user_awarded_idx`
  ON `xp_awards` (`user_id`, `awarded_at`);
