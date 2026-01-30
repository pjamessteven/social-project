-- Add deep_research boolean column to detrans_chat_cache table
-- This column distinguishes deep research cache entries from regular chat entries

-- Enable pg_trgm extension for text search indexes
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add the deep_research column with default false
ALTER TABLE detrans_chat_cache 
ADD COLUMN IF NOT EXISTS deep_research BOOLEAN DEFAULT false NOT NULL;

-- Create index on deep_research column for efficient queries
CREATE INDEX IF NOT EXISTS idx_detrans_chat_cache_deep_research 
ON detrans_chat_cache(deep_research);

-- Create composite index on question_name and deep_research for lookup queries
CREATE INDEX IF NOT EXISTS idx_detrans_chat_cache_question_deep_research 
ON detrans_chat_cache(question_name, deep_research);

-- Create index on prompt_text for ILIKE searches (using trigram index for text search)
CREATE INDEX IF NOT EXISTS idx_detrans_chat_cache_prompt_text 
ON detrans_chat_cache USING gin (prompt_text gin_trgm_ops);
