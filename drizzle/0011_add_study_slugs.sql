-- Per-locale translated slug segments for SEO-friendly study URLs (/studies/[slug])
CREATE TABLE IF NOT EXISTS study_slugs (
  study_id INTEGER NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  locale VARCHAR(10) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  PRIMARY KEY (study_id, locale)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_study_slugs_locale_slug ON study_slugs(locale, slug);
