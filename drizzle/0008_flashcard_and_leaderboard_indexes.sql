-- Add supporting indexes for SRS review queries and leaderboard scans.
--
-- flashcard_progress_user_id_idx:
--   Speeds up per-user SRS lookups (review queue, due-card counts). The
--   existing FK to users.id does NOT create an index in SQLite, so a
--   sequential scan was needed on every review fetch.
--
-- sandbox_snapshots_total_xp_idx:
--   Lets the leaderboard query (ORDER BY total_xp DESC LIMIT N) read
--   the top entries directly from the index without sorting the whole
--   table.

CREATE INDEX `flashcard_progress_user_id_idx`
  ON `flashcard_progress` (`user_id`);

CREATE INDEX `sandbox_snapshots_total_xp_idx`
  ON `sandbox_snapshots` (`total_xp`);
