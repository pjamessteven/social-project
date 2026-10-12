-- 0012: Add detrans_posts table and enrichment/embedding flags.
--
-- Context:
--   * detrans_comments currently holds a partial r/detrans comment history.
--     A full re-scrape (posts + comments) is being ingested, so we need a
--     posts table and a way to track which rows still need enrichment
--     (summary/questions/keywords) and Qdrant embedding for chat RAG.
--   * Reddit ids ("id" column, base36) are the merge key for incremental
--     ingests. The DB was verified to have no duplicate comment ids.
--   * `embedded` remains false for low-score comments (<3 upvotes): those are
--     kept for building complete user stories but are never embedded.

CREATE TABLE IF NOT EXISTS "detrans_posts" (
  "uuid" varchar(50) PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "text" text NOT NULL, -- selftext; '' for link/image posts
  "summary" text,
  "questions" text,
  "keywords" text,
  "username" varchar(255),
  "user_flair" varchar(255),
  "link" text UNIQUE,
  "score" integer,
  "created" timestamp NOT NULL,
  "id" varchar(50) NOT NULL,
  "url" text,
  "num_comments" integer,
  "is_self" boolean,
  "link_flair" varchar(255),
  "enriched" boolean DEFAULT false NOT NULL,
  "embedded" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_detrans_posts_id_unique" ON "detrans_posts" ("id");
CREATE INDEX IF NOT EXISTS "idx_detrans_posts_created" ON "detrans_posts" ("created");
CREATE INDEX IF NOT EXISTS "idx_detrans_posts_username" ON "detrans_posts" ("username");

-- Comments: track enrichment (summary/questions/keywords) and chat embedding.
ALTER TABLE "detrans_comments" ADD COLUMN IF NOT EXISTS "enriched" boolean DEFAULT false NOT NULL;
ALTER TABLE "detrans_comments" ADD COLUMN IF NOT EXISTS "embedded" boolean DEFAULT false NOT NULL;

-- Backfill existing rows: they were all enriched for the Qdrant chat index.
UPDATE "detrans_comments" SET "enriched" = true WHERE "summary" IS NOT NULL;
UPDATE "detrans_comments" SET "embedded" = true WHERE "summary" IS NOT NULL AND "questions" IS NOT NULL;

-- Merge key: replace the non-unique id index with a unique one (verified no dupes),
-- and add a username lookup index used when rebuilding per-user profiles.
DROP INDEX IF EXISTS "idx_detrans_comments_id";
CREATE UNIQUE INDEX IF NOT EXISTS "idx_detrans_comments_id_unique" ON "detrans_comments" ("id");
CREATE INDEX IF NOT EXISTS "idx_detrans_comments_username" ON "detrans_comments" ("username");
