-- Generated display names (pseudonyms) for storyteller users, keyed by the
-- private Reddit username. Filled in by tooling; cards/dialogs show the name
-- when present so usernames never leave the server.
CREATE TABLE IF NOT EXISTS detrans_user_display_names (
  username VARCHAR(255) PRIMARY KEY,
  display_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
