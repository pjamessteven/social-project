import { db } from "@/db";
import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import {
  cohortCte,
  FEATURE_CACHE_HEADERS,
  parseFeatureFilters,
} from "../helpers";

/**
 * Probability-weighted distribution of a choice feature for women and men
 * separately (each story spreads one unit across its options), so the
 * reason charts can show where the sexes differ.
 */
export async function GET(request: NextRequest) {
  try {
    const filters = parseFeatureFilters(request);
    const key = new URL(request.url).searchParams.get("key") ?? "";
    if (!/^[a-z0-9_]{1,100}$/.test(key)) {
      return NextResponse.json({ error: "key is required" }, { status: 400 });
    }

    const rows = Array.from(
      await db.execute(sql`
        WITH ${cohortCte(filters)}
        SELECT fu.sex, a.choice, a.probabilities
        FROM filtered_answers a
        JOIN detrans_features f ON f.id = a.feature_id
        JOIN filtered_users fu ON fu.username = a.username
        WHERE f.key = ${key}
          AND f.kind = 'choice'
          AND f.enabled = true
          AND fu.sex IN ('f', 'm')
      `),
    ) as unknown as {
      sex: "f" | "m";
      choice: string | null;
      probabilities: Record<string, number> | null;
    }[];

    const groups = {
      f: { n: 0, soft: {} as Record<string, number> },
      m: { n: 0, soft: {} as Record<string, number> },
    };
    for (const row of rows) {
      const group = groups[row.sex];
      const weights: [string, number][] =
        row.probabilities && typeof row.probabilities === "object"
          ? Object.entries(row.probabilities).filter(
              (entry): entry is [string, number] =>
                typeof entry[1] === "number",
            )
          : row.choice
            ? [[row.choice, 1]]
            : [];
      const mass = weights.reduce((sum, [, value]) => sum + value, 0);
      if (mass <= 0) continue;
      group.n += 1;
      for (const [option, value] of weights) {
        group.soft[option] = (group.soft[option] ?? 0) + value / mass;
      }
    }

    return NextResponse.json(
      { key, groups },
      { headers: FEATURE_CACHE_HEADERS },
    );
  } catch (error) {
    console.error("Error fetching choice by sex:", error);
    return NextResponse.json(
      { error: "Failed to fetch choice by sex" },
      { status: 500 },
    );
  }
}
