-- Create chat_feedback table for thumbs up/down feedback on assistant messages
CREATE TABLE IF NOT EXISTS chat_feedback (
  id SERIAL PRIMARY KEY,
  conversation_uuid VARCHAR(36) NOT NULL REFERENCES chat_conversations(uuid) ON DELETE CASCADE,
  message_id VARCHAR(36) NOT NULL,
  vote VARCHAR(4) NOT NULL,
  feedback_text TEXT,
  ip_address VARCHAR(45),
  username VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for querying feedback by conversation and message
CREATE INDEX IF NOT EXISTS idx_chat_feedback_conversation_message
  ON chat_feedback(conversation_uuid, message_id);

-- Index for IP-based deduplication and lookups
CREATE INDEX IF NOT EXISTS idx_chat_feedback_ip_address
  ON chat_feedback(ip_address);

-- Index for username-based lookups
CREATE INDEX IF NOT EXISTS idx_chat_feedback_username
  ON chat_feedback(username);

-- Index for unique constraint: one vote per IP per message
CREATE INDEX IF NOT EXISTS idx_chat_feedback_unique_ip_message
  ON chat_feedback(ip_address, message_id);

-- Index for unique constraint: one vote per username per message
CREATE INDEX IF NOT EXISTS idx_chat_feedback_unique_username_message
  ON chat_feedback(username, message_id);
