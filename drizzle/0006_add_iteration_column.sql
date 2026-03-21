-- Add iteration column to detrans_chat_cache table
-- This column stores numeric iteration values for tracking

-- Add iteration column to detrans_chat_cache table
ALTER TABLE detrans_chat_cache
ADD COLUMN IF NOT EXISTS iteration NUMERIC;

-- Create index on iteration column for efficient lookups
CREATE INDEX IF NOT EXISTS idx_detrans_chat_cache_iteration
ON detrans_chat_cache(iteration);
