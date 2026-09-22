-- Wiki pages (agent-managed, admin-only CRUD) with hierarchical paths
CREATE TABLE IF NOT EXISTS pages (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(255) NOT NULL,
  parent_id INTEGER REFERENCES pages(id) ON DELETE SET NULL,
  path TEXT NOT NULL UNIQUE,
  title VARCHAR(500) NOT NULL,
  title_translation TEXT,
  summary TEXT,
  summary_translation TEXT,
  content TEXT NOT NULL,
  content_translation TEXT,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  is_stub BOOLEAN NOT NULL DEFAULT FALSE,
  created_by VARCHAR(255),
  updated_by VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Per-locale translated slug segments (only stored when they differ from default)
CREATE TABLE IF NOT EXISTS page_slugs (
  page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  locale VARCHAR(10) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  PRIMARY KEY (page_id, locale)
);

CREATE INDEX IF NOT EXISTS idx_pages_path ON pages(path);
CREATE INDEX IF NOT EXISTS idx_pages_parent_id ON pages(parent_id);
CREATE INDEX IF NOT EXISTS idx_pages_published ON pages(published);
CREATE INDEX IF NOT EXISTS idx_page_slugs_locale_slug ON page_slugs(locale, slug);
