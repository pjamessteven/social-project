import { storyIdSql } from "@/app/lib/story-id";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { FEATURE_CACHE_HEADERS } from "../../features/helpers";

const STORY_ID_PATTERN = /^[0-9a-f]{1,32}$/i;

/**
 * Full story text for one anonymous story spotlight. The id is the short
 * salted username hash used by /api/stories/spotlight, so no usernames leave the
 * server. Translations are returned as JSON ({locale: text}) and resolved
 * client-side, matching the conversation summaries.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!STORY_ID_PATTERN.test(id)) {
      return NextResponse.json({ error: "Invalid story id" }, { status: 400 });
    }

    const rows = Array.from(
      await db.execute(sql`
        WITH latest_profiles AS (
          SELECT DISTINCT ON (username) username, experience, experience_summary
          FROM detrans_user_profiles
          ORDER BY username, run_id DESC
        )
        SELECT
          COALESCE(u.username, p.username) AS username,
          COALESCE(u.experience_summary, p.experience_summary) AS summary,
          u.experience_summary_translation AS "summaryTranslation",
          COALESCE(u.experience, p.experience) AS experience,
          u.experience_translation AS "experienceTranslation"
        FROM detrans_users u
        FULL OUTER JOIN latest_profiles p ON p.username = u.username
        WHERE ${storyIdSql(sql`COALESCE(u.username, p.username)`)} = ${id}
        LIMIT 1
      `),
    ) as unknown as {
      username: string;
      summary: string | null;
      summaryTranslation: string | null;
      experience: string | null;
      experienceTranslation: string | null;
    }[];

    const row = rows[0];
    if (!row || (!row.summary && !row.experience)) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        id,
        summary: row.summary,
        summaryTranslation: row.summaryTranslation,
        experience: row.experience,
        experienceTranslation: row.experienceTranslation,
      },
      { headers: FEATURE_CACHE_HEADERS },
    );
  } catch (error) {
    console.error("Error fetching story detail:", error);
    return NextResponse.json(
      { error: "Failed to fetch story" },
      { status: 500 },
    );
  }
}
