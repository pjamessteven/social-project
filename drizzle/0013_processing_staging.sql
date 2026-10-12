-- 0013: Staging tables for user profile reprocessing and Jev feature extraction.
--
-- Everything here is additive: existing detrans_users / detrans_tags rows are
-- untouched until a validation pass decides to cut over.
--
--   detrans_processing_runs         one row per pipeline run (profiles/features)
--   detrans_user_profiles           MiMo-generated experience/summary/red flags
--   detrans_user_profile_chunks     map-phase summaries for oversized users
--   detrans_user_timelines          MiMo-extracted numeric timeline
--   detrans_features                seeded canonical taxonomy (see app/lib/feature-taxonomy.ts)
--   detrans_user_features           raw Jev answers incl. probabilities

CREATE TABLE IF NOT EXISTS "detrans_processing_runs" (
  "id" serial PRIMARY KEY,
  "kind" varchar(50) NOT NULL, -- 'profiles' | 'features'
  "model" varchar(100),
  "taxonomy_version" varchar(50),
  "started_at" timestamp DEFAULT now() NOT NULL,
  "finished_at" timestamp,
  "stats" jsonb,
  "notes" text
);

CREATE TABLE IF NOT EXISTS "detrans_user_profiles" (
  "id" serial PRIMARY KEY,
  "run_id" integer NOT NULL REFERENCES "detrans_processing_runs"("id") ON DELETE CASCADE,
  "username" varchar(255) NOT NULL,
  "experience" text,
  "experience_summary" text,
  "red_flags_report" text,
  "sex" varchar(1),
  "comment_count" integer,
  "post_count" integer,
  "char_count" integer,
  "chunk_count" integer DEFAULT 0 NOT NULL,
  "first_item_date" timestamp,
  "model" varchar(100),
  "created_at" timestamp DEFAULT now() NOT NULL,
  UNIQUE ("run_id", "username")
);
CREATE INDEX IF NOT EXISTS "idx_detrans_user_profiles_username" ON "detrans_user_profiles" ("username");

CREATE TABLE IF NOT EXISTS "detrans_user_profile_chunks" (
  "id" serial PRIMARY KEY,
  "run_id" integer NOT NULL REFERENCES "detrans_processing_runs"("id") ON DELETE CASCADE,
  "username" varchar(255) NOT NULL,
  "chunk_index" integer NOT NULL,
  "date_start" timestamp,
  "date_end" timestamp,
  "item_count" integer,
  "char_count" integer,
  "summary" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  UNIQUE ("run_id", "username", "chunk_index")
);

CREATE TABLE IF NOT EXISTS "detrans_user_timelines" (
  "id" serial PRIMARY KEY,
  "run_id" integer NOT NULL REFERENCES "detrans_processing_runs"("id") ON DELETE CASCADE,
  "username" varchar(255) NOT NULL,
  "first_dysphoria_age" integer,
  "transition_age" integer,
  "detransition_age" integer,
  "hormones_age" integer,
  "top_surgery_age" integer,
  "bottom_surgery_age" integer,
  "puberty_blockers_age" integer,
  "transition_year" integer,
  "detransition_year" integer,
  "timeline" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  UNIQUE ("run_id", "username")
);
CREATE INDEX IF NOT EXISTS "idx_detrans_user_timelines_username" ON "detrans_user_timelines" ("username");

CREATE TABLE IF NOT EXISTS "detrans_features" (
  "id" serial PRIMARY KEY,
  "key" varchar(100) NOT NULL UNIQUE,
  "label" varchar(255) NOT NULL,
  "group" varchar(50) NOT NULL,
  "tier" varchar(20) NOT NULL, -- cause | process | outcome
  "kind" varchar(10) NOT NULL, -- noul | choice | score
  "question" jsonb NOT NULL,
  "tag_name" varchar(255),
  "tag_type" varchar(50),
  "threshold" real,
  "choice_tag_map" jsonb,
  "choice_tag_threshold" real,
  "enabled" boolean DEFAULT true NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "detrans_user_features" (
  "id" serial PRIMARY KEY,
  "run_id" integer NOT NULL REFERENCES "detrans_processing_runs"("id") ON DELETE CASCADE,
  "username" varchar(255) NOT NULL,
  "feature_id" integer NOT NULL REFERENCES "detrans_features"("id") ON DELETE CASCADE,
  "kind" varchar(10) NOT NULL,
  "noul" real,
  "score" real,
  "choice" varchar(100),
  "confidence" real,
  "probabilities" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  UNIQUE ("run_id", "username", "feature_id")
);
CREATE INDEX IF NOT EXISTS "idx_detrans_user_features_username" ON "detrans_user_features" ("username");
CREATE INDEX IF NOT EXISTS "idx_detrans_user_features_feature" ON "detrans_user_features" ("feature_id");
