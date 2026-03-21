-- Add request_id column to detrans_chat_cache and detrans_research_cache tables
-- This column stores unique identifiers for request tracking (max 36 chars for UUIDs)

-- Add request_id column to detrans_chat_cache table
ALTER TABLE detrans_chat_cache
ADD COLUMN IF NOT EXISTS request_id CHARACTER VARYING(36);

-- Add request_id column to detrans_research_cache table
ALTER TABLE detrans_research_cache
ADD COLUMN IF NOT EXISTS request_id CHARACTER VARYING(36);

-- Create index on request_id column for efficient lookups in detrans_chat_cache
CREATE INDEX IF NOT EXISTS idx_detrans_chat_cache_request_id
ON detrans_chat_cache(request_id);

-- Create index on request_id column for efficient lookups in detrans_research_cache
CREATE INDEX IF NOT EXISTS idx_detrans_research_cache_request_id
ON detrans_research_cache(request_id);
