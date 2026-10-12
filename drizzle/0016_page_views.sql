-- Public view counter for wiki (topic) pages. Incremented by
-- POST /api/pages/view (bots skipped, deduped per IP + page per day).
ALTER TABLE pages ADD COLUMN IF NOT EXISTS views_count INTEGER NOT NULL DEFAULT 0;
