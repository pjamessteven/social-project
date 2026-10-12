import { storyIdSql } from "@/app/lib/story-id";
import { storySlug } from "@/app/lib/story-urls";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import {
  cohortCte,
  FEATURE_CACHE_HEADERS,
  NOUL_THRESHOLD,
  parseFeatureFilters,
} from "../../features/helpers";
import {
  countAllStories,
  isDefaultFilters,
  MIN_SUMMARY_LENGTH,
  QUALITY_KEY,
} from "./count";

const CHIP_KEYS = [
  "regret_transition",
  "no_regret",
  "retransition",
  "currently_on_hormones",
  "still_identifies_trans",
  "took_hormones",
  "diy_hormones",
  "took_puberty_blockers",
  "top_surgery",
  "bottom_surgery",
  "only_social_transition",
  "never_transitioned",
  "contributed_online_influence",
  "contributed_coercion",
  "contributed_rapid_onset",
  "contributed_escapism",
  "mh_autism",
  "mh_adhd",
  "mh_depression",
  "mh_suicidality_since_detransition",
  "adv_childhood_abuse",
  "internalised_homophobia",
  "internalised_misogyny_misandry",
  "process_benefited_from_therapy",
  "process_detrans_community_exposure",
  "outcome_body_reconciliation",
  "social_isolation",
  "community_disillusionment",
] as const;

const STATUS_KEY = "current_status";
const MAX_CHIPS = 5;

function trimExcerpt(text: string, max = 420): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const slice = clean.slice(0, max);
  const lastStop = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf("! "),
    slice.lastIndexOf("? "),
  );
  return lastStop > 180 ? slice.slice(0, lastStop + 1) : `${slice.trimEnd()}…`;
}

function parseCount(raw: string | null, fallback: number): number {
  const value = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(value, 3), 18);
}

/**
 * Anonymous story spotlights: excerpts from the processed profiles with the
 * features they match, respecting the stats filters. No usernames leave the
 * server — story ids are short salted hashes used as React keys and for the
 * full-story lookup. Paged with `offset` for infinite scrolling; ordering is
 * a deterministic shuffle (`md5(username || seed)`), so pages are stable for
 * a given seed and filter set.
 */
export async function GET(request: NextRequest) {
  try {
    const filters = parseFeatureFilters(request);
    const { searchParams } = new URL(request.url);
    const seed =
      (searchParams.get("seed") ?? "0")
        .replace(/[^0-9a-z]/gi, "")
        .slice(0, 20) || "0";
    const count = parseCount(searchParams.get("count"), 9);
    const offset = Math.max(
      Number.parseInt(searchParams.get("offset") ?? "0", 10) || 0,
      0,
    );
    // Optional yes/no feature the stories must match ("show stories" links
    // on the charts). Keys are taxonomy identifiers, so keep them strict.
    const rawFeature = searchParams.get("feature");
    const featureKey =
      rawFeature && /^[a-z0-9_]{1,100}$/.test(rawFeature) ? rawFeature : null;
    const featureCondition = featureKey
      ? sql`AND EXISTS (
          SELECT 1
          FROM answers fa
          JOIN detrans_features ff ON ff.id = fa.feature_id
          WHERE fa.username = lp.username
            AND ff.key = ${featureKey}
            AND ff.kind = 'noul'
            AND fa.noul >= COALESCE(ff.threshold, ${NOUL_THRESHOLD})
        )`
      : sql``;
    // Default order is "top": highest overall Reddit score first. The
    // "shuffle" mode keeps the old deterministic shuffle for variety.
    const shuffle = searchParams.get("sort") === "shuffle";
    const orderBy = shuffle
      ? sql`ORDER BY md5(lp.username || ${seed})`
      : sql`ORDER BY up.upvotes DESC NULLS LAST, md5(lp.username || ${seed})`;

    // The unfiltered count, for "N of M stories". Only the first page needs
    // it, and only when the filters narrow the set.
    const filtered = featureKey != null || !isDefaultFilters(filters);
    const allTotalPromise =
      offset === 0 && filtered ? countAllStories() : Promise.resolve(null);

    const storyRows = Array.from(
      await db.execute(sql`
        WITH ${cohortCte(filters)}
        SELECT
          lp.username,
          ${storyIdSql(sql`lp.username`)} AS id,
          COALESCE(lp.experience_summary, LEFT(lp.experience, 600)) AS excerpt,
          fu.sex,
          t.first_dysphoria_age,
          t.transition_age,
          t.detransition_age,
          st.status,
          up.upvotes,
          (count(*) OVER ())::int AS total
        FROM (
          SELECT DISTINCT ON (username) username, experience_summary, experience
          FROM detrans_user_profiles
          ORDER BY username, run_id DESC
        ) lp
        JOIN cohort c ON c.username = lp.username
        LEFT JOIN filtered_users fu ON fu.username = lp.username
        LEFT JOIN latest_timelines t ON t.username = lp.username
        LEFT JOIN (
          SELECT a.username, a.score AS quality_score
          FROM answers a
          JOIN detrans_features f ON f.id = a.feature_id
          WHERE f.key = ${QUALITY_KEY} AND f.enabled = true
        ) q ON q.username = lp.username
        LEFT JOIN (
          SELECT a.username, a.choice AS status
          FROM answers a
          JOIN detrans_features f ON f.id = a.feature_id
          WHERE f.key = ${STATUS_KEY}
        ) st ON st.username = lp.username
        LEFT JOIN (
          SELECT i.username, COALESCE(SUM(i.score), 0)::int AS upvotes
          FROM (
            SELECT username, score FROM detrans_comments
            UNION ALL
            SELECT username, score FROM detrans_posts
          ) i
          JOIN cohort c2 ON c2.username = i.username
          GROUP BY i.username
        ) up ON up.username = lp.username
        WHERE length(COALESCE(lp.experience_summary, lp.experience)) >= ${MIN_SUMMARY_LENGTH}
          AND (q.quality_score IS NULL OR q.quality_score >= 1)
          ${featureCondition}
        ${orderBy}
        LIMIT ${count} OFFSET ${offset}
      `),
    ) as unknown as {
      username: string;
      id: string;
      excerpt: string;
      sex: string | null;
      first_dysphoria_age: number | null;
      transition_age: number | null;
      detransition_age: number | null;
      status: string | null;
      upvotes: number | null;
      total: number;
    }[];

    const allTotal = await allTotalPromise;

    if (storyRows.length === 0) {
      return NextResponse.json(
        { cohort: 0, total: 0, allTotal, hasMore: false, stories: [] },
        { headers: FEATURE_CACHE_HEADERS },
      );
    }

    const usernames = storyRows.map((row) => row.username);
    const usernameList = sql.join(
      usernames.map((username) => sql`${username}`),
      sql`, `,
    );

    const answerRows = Array.from(
      await db.execute(sql`
        WITH ${cohortCte(filters)}
        SELECT
          a.username,
          f.key,
          f.tag_name AS "tagName",
          a.noul,
          a.score,
          COALESCE(f.threshold, ${NOUL_THRESHOLD})::float AS threshold
        FROM answers a
        JOIN detrans_features f ON f.id = a.feature_id
        WHERE f.enabled = true
          AND a.username IN (${usernameList})
          AND f.key IN (${sql.join(
            [...CHIP_KEYS, QUALITY_KEY].map((key) => sql`${key}`),
            sql`, `,
          )})
      `),
    ) as unknown as {
      username: string;
      key: string;
      tagName: string | null;
      noul: number | null;
      score: number | null;
      threshold: number;
    }[];

    // Overall net Reddit score across the user's posts and comments, plus the
    // generated display name (if one has been assigned yet).
    const userRows = Array.from(
      await db.execute(sql`
        SELECT
          items.username,
          dn.display_name AS "displayName",
          COALESCE(SUM(items.score), 0)::int AS upvotes
        FROM (
          SELECT username, score FROM detrans_comments WHERE username IN (${usernameList})
          UNION ALL
          SELECT username, score FROM detrans_posts WHERE username IN (${usernameList})
        ) items
        LEFT JOIN detrans_user_display_names dn ON dn.username = items.username
        GROUP BY items.username, dn.display_name
      `),
    ) as unknown as {
      username: string;
      displayName: string | null;
      upvotes: number;
    }[];

    const byUser = new Map<
      string,
      Map<
        string,
        { truth: boolean; tagName: string | null; score: number | null }
      >
    >();
    for (const row of answerRows) {
      let answers = byUser.get(row.username);
      if (!answers) {
        answers = new Map();
        byUser.set(row.username, answers);
      }
      answers.set(row.key, {
        truth: typeof row.noul === "number" && row.noul >= row.threshold,
        tagName: row.tagName,
        score: row.score,
      });
    }

    const userMeta = new Map(
      userRows.map((row) => [
        row.username,
        { displayName: row.displayName, upvotes: row.upvotes },
      ]),
    );

    const stories = storyRows.map((row) => {
      const answers = byUser.get(row.username);
      const chips: { key: string; tag: string | null }[] = [];
      for (const key of CHIP_KEYS) {
        if (chips.length >= MAX_CHIPS) break;
        const answer = answers?.get(key);
        if (!answer?.truth) continue;
        chips.push({ key, tag: answer.tagName });
      }
      const meta = userMeta.get(row.username);
      const name = meta?.displayName ?? null;
      return {
        id: row.id,
        slug: storySlug(row.id, name),
        name,
        sex: row.sex === "m" || row.sex === "f" ? row.sex : null,
        status:
          row.status === "detransitioned" || row.status === "desisted"
            ? row.status
            : null,
        excerpt: trimExcerpt(row.excerpt),
        upvotes: row.upvotes ?? meta?.upvotes ?? 0,
        ages: {
          firstDysphoria: row.first_dysphoria_age,
          transition: row.transition_age,
          detransition: row.detransition_age,
        },
        chips,
      };
    });

    const total = Number(storyRows[0]?.total ?? stories.length);
    return NextResponse.json(
      {
        cohort: total,
        total,
        allTotal: offset === 0 && !filtered ? total : allTotal,
        hasMore: offset + stories.length < total,
        stories,
      },
      { headers: FEATURE_CACHE_HEADERS },
    );
  } catch (error) {
    console.error("Error fetching story spotlights:", error);
    return NextResponse.json(
      { error: "Failed to fetch story spotlights" },
      { status: 500 },
    );
  }
}
