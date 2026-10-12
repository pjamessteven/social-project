/**
 * Public story ids (server-only).
 *
 * A story id is the first 8 hex chars of md5(STORY_ID_SALT || username). The
 * secret salt matters: an unsalted hash would let anyone who knows a Reddit
 * username compute which story page belongs to it. Changing the salt changes
 * every story URL, so treat it as permanent once pages are indexed.
 */

import { sql, type SQL } from "drizzle-orm";

const DEV_SALT = "detrans-dev-story-salt";

let warned = false;

function storyIdSalt(): string {
  const salt = process.env.STORY_ID_SALT;
  if (salt) return salt;
  if (process.env.NODE_ENV === "production") {
    throw new Error("STORY_ID_SALT must be set to serve story ids");
  }
  if (!warned) {
    warned = true;
    console.warn("STORY_ID_SALT is not set; using a development salt");
  }
  return DEV_SALT;
}

/** SQL expression for the public story id of a username column. */
export function storyIdSql(username: SQL): SQL {
  return sql`substr(md5(${storyIdSalt()} || ${username}), 1, 8)`;
}
