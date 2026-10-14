-- Curated study categories for the /studies hub: "topic" categories (what a
-- study is about) and "method" categories (how it was done). Names,
-- descriptions and URL slugs are translated per locale as JSON objects
-- ({ locale: value }), like the other *_translation columns.
CREATE TABLE IF NOT EXISTS study_categories (
  id SERIAL PRIMARY KEY,
  kind VARCHAR(10) NOT NULL CHECK (kind IN ('topic', 'method')),
  slug VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  name_translation TEXT,
  description TEXT NOT NULL DEFAULT '',
  description_translation TEXT,
  slug_translation TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_study_categories_kind_slug ON study_categories(kind, slug);

CREATE TABLE IF NOT EXISTS study_category_relations (
  study_id INTEGER NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES study_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (study_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_study_category_relations_category ON study_category_relations(category_id);

-- Short card copy for the study grids (the long description / key_points stay
-- on the detail page)
ALTER TABLE studies ADD COLUMN IF NOT EXISTS card_summary TEXT;
ALTER TABLE studies ADD COLUMN IF NOT EXISTS card_summary_translation TEXT;
ALTER TABLE studies ADD COLUMN IF NOT EXISTS card_key_points JSONB;
ALTER TABLE studies ADD COLUMN IF NOT EXISTS card_key_points_translation TEXT;
