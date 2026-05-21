-- Drop stance column from studies
ALTER TABLE studies DROP COLUMN IF EXISTS stance;

-- Drop old tags JSONB column from studies
ALTER TABLE studies DROP COLUMN IF EXISTS tags;

-- Add key_points_translation column
ALTER TABLE studies ADD COLUMN IF NOT EXISTS key_points_translation TEXT;

-- Change limitations from text to jsonb
-- First, if limitations exists as text, convert it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'studies' AND column_name = 'limitations'
    AND data_type = 'text'
  ) THEN
    -- Add temp jsonb column
    ALTER TABLE studies ADD COLUMN limitations_jsonb JSONB;
    -- Convert text to jsonb array (wrap single string in array)
    UPDATE studies SET limitations_jsonb = CASE
      WHEN limitations IS NULL OR limitations = '' THEN NULL
      ELSE to_jsonb(ARRAY[limitations])
    END;
    -- Drop old column and rename
    ALTER TABLE studies DROP COLUMN limitations;
    ALTER TABLE studies RENAME COLUMN limitations_jsonb TO limitations;
  ELSE
    -- Column doesn't exist or is already jsonb, just ensure it exists
    ALTER TABLE studies ADD COLUMN IF NOT EXISTS limitations JSONB;
  END IF;
END $$;

-- Create study_tags table
CREATE TABLE IF NOT EXISTS study_tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  translations TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create study_tag_relations table
CREATE TABLE IF NOT EXISTS study_tag_relations (
  study_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (study_id, tag_id)
);
