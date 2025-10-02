-- Detrans tables
CREATE TABLE IF NOT EXISTS "detrans_questions" (
	"name" varchar(255) PRIMARY KEY NOT NULL,
	"views_count" integer DEFAULT 0 NOT NULL,
	"most_recently_asked" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "detrans_cache" (
	"prompt_hash" varchar(64) PRIMARY KEY NOT NULL,
	"prompt_text" text NOT NULL,
	"result_text" text NOT NULL,
	"question_name" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_accessed" timestamp DEFAULT now() NOT NULL
);

-- Affirm tables
CREATE TABLE IF NOT EXISTS "affirm_questions" (
	"name" varchar(255) PRIMARY KEY NOT NULL,
	"views_count" integer DEFAULT 0 NOT NULL,
	"most_recently_asked" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "affirm_cache" (
	"prompt_hash" varchar(64) PRIMARY KEY NOT NULL,
	"prompt_text" text NOT NULL,
	"result_text" text NOT NULL,
	"question_name" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_accessed" timestamp DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_detrans_questions_name" ON "detrans_questions" ("name");
CREATE INDEX IF NOT EXISTS "idx_detrans_cache_question" ON "detrans_cache" ("question_name");
CREATE INDEX IF NOT EXISTS "idx_detrans_cache_created" ON "detrans_cache" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_affirm_questions_name" ON "affirm_questions" ("name");
CREATE INDEX IF NOT EXISTS "idx_affirm_cache_question" ON "affirm_cache" ("question_name");
CREATE INDEX IF NOT EXISTS "idx_affirm_cache_created" ON "affirm_cache" ("created_at");

-- Foreign key constraints
DO $$ BEGIN
 ALTER TABLE "detrans_cache" ADD CONSTRAINT "detrans_cache_question_name_detrans_questions_name_fk" FOREIGN KEY ("question_name") REFERENCES "detrans_questions"("name") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "affirm_cache" ADD CONSTRAINT "affirm_cache_question_name_affirm_questions_name_fk" FOREIGN KEY ("question_name") REFERENCES "affirm_questions"("name") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
