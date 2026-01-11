-- Add archived column to chat_conversations table
ALTER TABLE chat_conversations
ADD COLUMN archived BOOLEAN NOT NULL DEFAULT false;

-- Create index for archived column
CREATE INDEX IF NOT EXISTS idx_chat_conversations_archived ON chat_conversations(archived);
