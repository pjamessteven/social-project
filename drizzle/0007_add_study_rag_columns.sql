-- Add RAG and approval columns to studies table

-- Add approved column (replaces processed for visibility gating)
ALTER TABLE studies
ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT false;

-- Add full text column for embedding
ALTER TABLE studies
ADD COLUMN IF NOT EXISTS full_text TEXT;

-- Add abstract column
ALTER TABLE studies
ADD COLUMN IF NOT EXISTS abstract TEXT;

-- Add conclusion column
ALTER TABLE studies
ADD COLUMN IF NOT EXISTS conclusion TEXT;

-- Add key points column (JSONB array)
ALTER TABLE studies
ADD COLUMN IF NOT EXISTS key_points JSONB;

-- Add summary column
ALTER TABLE studies
ADD COLUMN IF NOT EXISTS summary TEXT;

-- Add journal column (was missing from schema definition)
ALTER TABLE studies
ADD COLUMN IF NOT EXISTS journal VARCHAR(500);

-- Set all existing studies as unapproved (admin must re-approve with full text)
UPDATE studies SET approved = false;

-- Create index on approved column for efficient filtering
CREATE INDEX IF NOT EXISTS idx_studies_approved ON studies(approved);
