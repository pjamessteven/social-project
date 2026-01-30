-- Add translation columns to videos table if they don't exist
ALTER TABLE videos 
ADD COLUMN IF NOT EXISTS description_translation text,
ADD COLUMN IF NOT EXISTS summary_translation text,
ADD COLUMN IF NOT EXISTS bite_translation text,
ADD COLUMN IF NOT EXISTS title_translation text;
