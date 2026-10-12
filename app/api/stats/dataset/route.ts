import { db } from "@/db";
import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import {
  cohortCte,
  FEATURE_CACHE_HEADERS,
  parseFeatureFilters,
} from "@/app/api/features/helpers";

interface CountsRow {
  comments: number;
  posts: number;
  authors: number;
  selected: number;
}

/**
 * Provenance numbers for the Methodology section: how the raw /r/detrans
 * corpus turns into the stories behind the charts. Everything is counted live
 * so the copy stays honest when the corpus or the extractions are refreshed.
 */
export async function GET(request: NextRequest) {
  try {
    const filters = parseFeatureFilters(request);

    const [countsRows, statusRows, cohortRows] = await Promise.all([
      db.execute(sql`
        SELECT
          (SELECT count(*) FROM detrans_comments)::int AS comments,
          (SELECT count(*) FROM detrans_posts)::int AS posts,
          (SELECT count(DISTINCT username) FROM detrans_comments)::int AS authors,
          (SELECT count(*) FROM detrans_users)::int AS selected
      `),
      db.execute(sql`
        WITH ${cohortCte(filters)}
        SELECT count(*)::int AS kept FROM stats_status
      `),
      db.execute(sql`
        WITH ${cohortCte(filters)}
        SELECT count(*)::int AS c FROM cohort
      `),
    ]);

    const [counts] = Array.from(countsRows) as unknown as CountsRow[];
    const [status] = Array.from(statusRows) as unknown as { kept: number }[];
    const [cohort] = Array.from(cohortRows) as unknown as { c: number }[];

    const selected = Number(counts?.selected ?? 0);
    const kept = Number(status?.kept ?? 0);

    return NextResponse.json(
      {
        comments: Number(counts?.comments ?? 0),
        posts: Number(counts?.posts ?? 0),
        authors: Number(counts?.authors ?? 0),
        selected,
        removed: Math.max(0, selected - kept),
        remaining: kept,
        cohort: Number(cohort?.c ?? 0),
      },
      { headers: FEATURE_CACHE_HEADERS },
    );
  } catch (error) {
    console.error("Error fetching dataset stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch dataset stats" },
      { status: 500 },
    );
  }
}
