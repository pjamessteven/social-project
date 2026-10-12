import { db } from "@/db";
import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { withFeatureCache } from "../cache";
import {
  cohortCte,
  FEATURE_CACHE_HEADERS,
  NOUL_THRESHOLD,
  parseFeatureFilters,
} from "../helpers";

const BEFORE_KEY = "sexuality_before";
const AFTER_KEY = "sexuality_after";
const STATEMENT_KEYS = [
  "sexuality_changed",
  "internalised_homophobia",
  "internalised_misogyny_misandry",
];
/** Stated orientations, relative to birth sex. "unclear" is left out. */
const ORIENTATIONS = [
  "homosexual",
  "bisexual",
  "heterosexual",
  "asexual",
  "other",
] as const;

type Counts = Record<string, number>;
const emptyCounts = (): Counts =>
  Object.fromEntries(ORIENTATIONS.map((option) => [option, 0]));

/**
 * Orientation before transition and after detransition (each story's top
 * answer, relative to birth sex), restricted to stories that actually state
 * it:
 *
 *   before   -> orientation before transition, for women and men
 *   matrix   -> before x after counts for stories stating both
 *   stated   -> how many stories state each side (coverage)
 *   statements -> related yes/no features with per-sex counts
 */
async function getFeature(request: NextRequest) {
  try {
    const filters = parseFeatureFilters(request);

    const [choiceRowsRaw, statementRowsRaw, cohortRowRaw] = await Promise.all([
      db.execute(sql`
        WITH ${cohortCte(filters)}
        SELECT a.username, f.key, a.choice, fu.sex
        FROM filtered_answers a
        JOIN detrans_features f ON f.id = a.feature_id
        LEFT JOIN filtered_users fu ON fu.username = a.username
        WHERE f.enabled = true
          AND f.key IN (${BEFORE_KEY}, ${AFTER_KEY})
      `),
      db.execute(sql`
        WITH ${cohortCte(filters)}
        SELECT
          f.key,
          f.label,
          count(a.username)::int AS n,
          (
            count(*) FILTER (WHERE a.noul >= COALESCE(f.threshold, ${NOUL_THRESHOLD}))
          )::int AS above,
          (count(*) FILTER (WHERE fu.sex = 'f'))::int AS "nF",
          (
            count(*) FILTER (
              WHERE fu.sex = 'f'
                AND a.noul >= COALESCE(f.threshold, ${NOUL_THRESHOLD})
            )
          )::int AS "aboveF",
          (count(*) FILTER (WHERE fu.sex = 'm'))::int AS "nM",
          (
            count(*) FILTER (
              WHERE fu.sex = 'm'
                AND a.noul >= COALESCE(f.threshold, ${NOUL_THRESHOLD})
            )
          )::int AS "aboveM"
        FROM filtered_answers a
        JOIN detrans_features f ON f.id = a.feature_id
        LEFT JOIN filtered_users fu ON fu.username = a.username
        WHERE f.enabled = true
          AND f.key IN (${sql.join(
            STATEMENT_KEYS.map((key) => sql`${key}`),
            sql`, `,
          )})
        GROUP BY f.id
      `),
      db.execute(sql`
        WITH ${cohortCte(filters)}
        SELECT count(*)::int AS c FROM cohort
      `),
    ]);

    const choiceRows = Array.from(choiceRowsRaw) as unknown as {
      username: string;
      key: string;
      choice: string | null;
      sex: string | null;
    }[];
    const statementRows = Array.from(statementRowsRaw) as Record<
      string,
      unknown
    >[];
    const [cohortRow] = Array.from(cohortRowRaw) as unknown as { c: number }[];

    const isStated = (choice: string | null): choice is string =>
      choice != null && (ORIENTATIONS as readonly string[]).includes(choice);

    const byUser = new Map<
      string,
      { sex: string | null; before?: string; after?: string }
    >();
    for (const row of choiceRows) {
      const entry = byUser.get(row.username) ?? { sex: row.sex };
      if (isStated(row.choice)) {
        if (row.key === BEFORE_KEY) entry.before = row.choice;
        else entry.after = row.choice;
      }
      byUser.set(row.username, entry);
    }

    const before = { f: emptyCounts(), m: emptyCounts() };
    const after = { f: emptyCounts(), m: emptyCounts() };
    const matrix: Record<string, Counts> = Object.fromEntries(
      ORIENTATIONS.map((option) => [option, emptyCounts()]),
    );
    let nBefore = 0;
    let nAfter = 0;
    let nBoth = 0;
    for (const entry of byUser.values()) {
      const sex = entry.sex === "f" || entry.sex === "m" ? entry.sex : null;
      if (entry.before) {
        nBefore += 1;
        if (sex) before[sex][entry.before] += 1;
      }
      if (entry.after) {
        nAfter += 1;
        if (sex) after[sex][entry.after] += 1;
      }
      if (entry.before && entry.after) {
        nBoth += 1;
        matrix[entry.before][entry.after] += 1;
      }
    }

    const statements = STATEMENT_KEYS.map((key) => {
      const row = statementRows.find((candidate) => candidate.key === key);
      if (!row) return null;
      return {
        key,
        label: row.label as string,
        n: Number(row.n),
        above: Number(row.above),
        bySex: {
          f: { n: Number(row.nF), above: Number(row.aboveF) },
          m: { n: Number(row.nM), above: Number(row.aboveM) },
        },
      };
    }).filter((row): row is NonNullable<typeof row> => Boolean(row));

    return NextResponse.json(
      {
        cohort: Number(cohortRow?.c ?? 0),
        orientations: ORIENTATIONS,
        stated: { before: nBefore, after: nAfter, both: nBoth },
        before,
        after,
        matrix,
        statements,
      },
      { headers: FEATURE_CACHE_HEADERS },
    );
  } catch (error) {
    console.error("Error fetching sexuality data:", error);
    return NextResponse.json(
      { error: "Failed to fetch sexuality data" },
      { status: 500 },
    );
  }
}

export const GET = withFeatureCache(getFeature);
