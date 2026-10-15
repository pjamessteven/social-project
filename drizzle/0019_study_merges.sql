-- Duplicate study records can point at the record they were merged into;
-- resolveStudySlugParam redirects their URLs (numeric id and slugs) there.
ALTER TABLE studies ADD COLUMN IF NOT EXISTS merged_into INTEGER REFERENCES studies(id);
