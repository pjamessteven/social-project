-- Long-form markdown evidence summary shown on each study category page,
-- with JSON { locale: markdown } translations.
ALTER TABLE study_categories ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE study_categories ADD COLUMN IF NOT EXISTS summary_translation TEXT;
