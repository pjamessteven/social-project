import { db } from "@/db";
import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { withFeatureCache } from "../cache";
import {
  cohortCte,
  FEATURE_CACHE_HEADERS,
  parseFeatureFilters,
} from "../helpers";

const BIN_COUNT = 20;
const MIN_GROUP_SIZE = 15;
const EXCLUDED_GROUPS = new Set(["unclear"]);

interface AnswerRow {
  username: string;
  key: string;
  noul: number | null;
  choice: string | null;
}

interface BandCounts {
  no: number;
  mixed: number;
  yes: number;
}

/**
 * Full probability distribution of a yes/no feature, optionally split by a
 * choice feature (default current_status). Designed for the suicidality
 * section: the binary threshold hides the shape, this exposes where the
 * probability mass actually clusters.
 */
async function getFeature(request: NextRequest) {
  try {
    const filters = parseFeatureFilters(request);
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");
    const splitKey = searchParams.get("split") ?? "current_status";
    if (!key) {
      return NextResponse.json(
        { error: "key parameter is required" },
        { status: 400 },
      );
    }

    const rows = Array.from(
      await db.execute(sql`
        WITH ${cohortCte(filters)}
        SELECT a.username, f.key, a.noul, a.choice
        FROM filtered_answers a
        JOIN detrans_features f ON f.id = a.feature_id
        WHERE f.enabled = true
          AND f.key IN (${key}, ${splitKey})
      `),
    ) as unknown as AnswerRow[];

    const byUser = new Map<string, { value?: number; group?: string }>();
    for (const row of rows) {
      let entry = byUser.get(row.username);
      if (!entry) {
        entry = {};
        byUser.set(row.username, entry);
      }
      if (row.key === key) {
        if (typeof row.noul === "number") entry.value = row.noul;
      } else if (row.key === splitKey) {
        if (row.choice) entry.group = row.choice;
      }
    }

    const emptyBins = () => Array.from({ length: BIN_COUNT }, () => 0);
    const emptyBands = (): BandCounts => ({ no: 0, mixed: 0, yes: 0 });

    const overall = { n: 0, counts: emptyBins(), bands: emptyBands() };
    const groups = new Map<
      string,
      { key: string; n: number; counts: number[]; bands: BandCounts }
    >();

    const addTo = (
      target: { counts: number[]; bands: BandCounts },
      value: number,
    ) => {
      const index = Math.min(
        BIN_COUNT - 1,
        Math.max(0, Math.floor(value * BIN_COUNT)),
      );
      target.counts[index] += 1;
      if (value < 0.2) target.bands.no += 1;
      else if (value < 0.8) target.bands.mixed += 1;
      else target.bands.yes += 1;
    };

    for (const entry of byUser.values()) {
      if (entry.value == null) continue;
      overall.n += 1;
      addTo(overall, entry.value);

      const groupKey = entry.group;
      if (!groupKey || EXCLUDED_GROUPS.has(groupKey)) continue;
      let group = groups.get(groupKey);
      if (!group) {
        group = {
          key: groupKey,
          n: 0,
          counts: emptyBins(),
          bands: emptyBands(),
        };
        groups.set(groupKey, group);
      }
      group.n += 1;
      addTo(group, entry.value);
    }

    return NextResponse.json(
      {
        key,
        split: splitKey,
        bins: BIN_COUNT,
        overall,
        groups: [...groups.values()]
          .filter((group) => group.n >= MIN_GROUP_SIZE)
          .sort((a, b) => b.n - a.n),
      },
      { headers: FEATURE_CACHE_HEADERS },
    );
  } catch (error) {
    console.error("Error fetching distribution:", error);
    return NextResponse.json(
      { error: "Failed to fetch distribution" },
      { status: 500 },
    );
  }
}

export const GET = withFeatureCache(getFeature);
