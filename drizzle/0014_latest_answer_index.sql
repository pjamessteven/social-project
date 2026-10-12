-- 0014: Index for resolving the newest answer per (username, feature) across
-- processing runs. Extraction runs can be incremental (e.g. a single new
-- question extracted on its own), so all feature stats read the latest answer
-- per (username, feature_id) rather than assuming one run answers everything.
-- This index lets `DISTINCT ON (username, feature_id) ... ORDER BY username,
-- feature_id, run_id DESC` run without a full sort.

CREATE INDEX IF NOT EXISTS "idx_detrans_user_features_user_feature_run"
  ON "detrans_user_features" ("username", "feature_id", "run_id" DESC);
