import { db } from "@/db";
import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import {
  cohortCte,
  FEATURE_CACHE_HEADERS,
  NOUL_THRESHOLD,
  parseFeatureFilters,
} from "../helpers";

const CAUSE_KEYS = [
  "contributed_online_influence",
  "contributed_peer_influence",
  "contributed_coercion",
  "contributed_rapid_onset",
  "contributed_escapism",
  "contributed_porn",
  "contributed_anime_fandom",
  "internalised_homophobia",
  "internalised_misogyny_misandry",
  "mh_autism",
  "mh_adhd",
  "mh_depression",
  "adv_childhood_abuse",
  "adv_trauma_history",
  "puberty_discomfort",
  "gender_nonconformity_childhood",
];

const OUTCOME_KEYS = [
  "regret_transition",
  "no_regret",
  "retransition",
  "mh_suicidality_since_detransition",
  "social_isolation",
  "community_disillusionment",
  "outcome_body_reconciliation",
  "outcome_detrans_support_network",
  "still_identifies_trans",
  "currently_on_hormones",
];

const IMPROVEMENT_KEYS = [
  "outcome_quality_of_life",
  "mh_change_after_detransition",
] as const;

/**
 * Taxonomy labels that carry editorial disambiguation and read badly inside a
 * sentence ("Mental health issues (generic)"). Highlight cards use these
 * display forms instead.
 */
const DISPLAY_LABELS: Record<string, string> = {
  mh_generic: "Mental health issues",
};

interface AnswerRow {
  username: string;
  key: string;
  noul: number | null;
  threshold: number;
}

/**
 * Editorially ranked insights for the highlights ribbon. Candidates are
 * ranked by effect size x sample size with minimum-n gates, and the result
 * is one card per category. Descriptive only, not significance-tested.
 */
export async function GET(request: NextRequest) {
  try {
    const filters = parseFeatureFilters(request);

    const [cohortRow] = Array.from(
      await db.execute(sql`
        WITH ${cohortCte(filters)}
        SELECT count(*)::int AS c FROM cohort
      `),
    ) as unknown as { c: number }[];
    const cohort = Number(cohortRow?.c ?? 0);
    if (cohort === 0) {
      return NextResponse.json(
        { cohort: 0, highlights: [] },
        { headers: FEATURE_CACHE_HEADERS },
      );
    }

    const minN = Math.max(5, Math.min(50, Math.floor(cohort * 0.3)));
    const minSide = Math.max(4, Math.floor(minN / 2));
    const pairKeys = [...new Set([...CAUSE_KEYS, ...OUTCOME_KEYS])];

    // The candidate queries are independent; run them in parallel.
    const [
      prevalenceRowsRaw,
      pairRowsRaw,
      improvementRowsRaw,
      journeyRowsRaw,
      minorsRowsRaw,
    ] = await Promise.all([
      db.execute(sql`
        WITH ${cohortCte(filters)}
        SELECT
          f.key,
          f.label,
          f."group",
          f.tag_name AS "tagName",
          count(a.username)::int AS n,
          (
            count(*) FILTER (WHERE a.noul >= COALESCE(f.threshold, ${NOUL_THRESHOLD}))
          )::int AS above,
          (
            count(*) FILTER (
              WHERE a.noul >= 0.2
                AND a.noul < COALESCE(f.threshold, ${NOUL_THRESHOLD})
            )
          )::int AS uncertain
        FROM detrans_features f
        JOIN filtered_answers a
          ON a.feature_id = f.id
        WHERE f.enabled = true
          AND f.kind = 'noul'
          AND f."group" <> 'quality'
        GROUP BY f.id
        HAVING count(a.username) >= ${minN}
      `),
      db.execute(sql`
        WITH ${cohortCte(filters)}
        SELECT
          a.username,
          f.key,
          a.noul,
          COALESCE(f.threshold, ${NOUL_THRESHOLD})::float AS threshold
        FROM filtered_answers a
        JOIN detrans_features f ON f.id = a.feature_id
        WHERE f.enabled = true
          AND f.kind = 'noul'
          AND f.key IN (${sql.join(
            pairKeys.map((key) => sql`${key}`),
            sql`, `,
          )})
      `),
      db.execute(sql`
        WITH ${cohortCte(filters)}
        SELECT
          f.key,
          a.score
        FROM filtered_answers a
        JOIN detrans_features f ON f.id = a.feature_id
        WHERE f.enabled = true
          AND f.kind = 'score'
          AND f.key IN (${sql.join(
            IMPROVEMENT_KEYS.map((key) => sql`${key}`),
            sql`, `,
          )})
      `),
      db.execute(sql`
        WITH ${cohortCte(filters)}
        SELECT
          percentile_cont(0.5) WITHIN GROUP (ORDER BY t.first_dysphoria_age) AS dysphoria,
          percentile_cont(0.5) WITHIN GROUP (ORDER BY t.transition_age) AS transition,
          percentile_cont(0.5) WITHIN GROUP (ORDER BY t.detransition_age) AS detransition,
          count(t.transition_age)::int AS n
        FROM latest_timelines t
        WHERE t.username IN (SELECT username FROM cohort)
      `),
      db.execute(sql`
        WITH ${cohortCte(filters)}
        SELECT
          count(t.transition_age)::int AS "nAge",
          count(*) FILTER (WHERE t.transition_age < 18)::int AS "nMinor",
          count(*) FILTER (WHERE t.transition_age <= 15)::int AS "nLe15",
          count(t.first_dysphoria_age)::int AS "nDys",
          count(*) FILTER (WHERE t.first_dysphoria_age <= 12)::int AS "nDysChild",
          count(*) FILTER (WHERE t.transition_age < 18 AND fu.sex = 'f')::int AS "nMinorFemale",
          count(t.puberty_blockers_age)::int AS "nBlockers",
          min(t.puberty_blockers_age)::int AS "minBlockers"
        FROM latest_timelines t
        JOIN cohort c ON c.username = t.username
        JOIN filtered_users fu ON fu.username = t.username
      `),
    ]);

    const highlights: Record<string, unknown>[] = [];

    // ── Started young (headline stats from the timeline data) ─────────────
    const [minorsRow] = Array.from(minorsRowsRaw) as unknown as {
      nAge: number;
      nMinor: number;
      nLe15: number;
      nDys: number;
      nDysChild: number;
      nMinorFemale: number;
      nBlockers: number;
      minBlockers: number | null;
    }[];
    if (minorsRow && Number(minorsRow.nAge) >= minN) {
      const nAge = Number(minorsRow.nAge);
      const nMinor = Number(minorsRow.nMinor);
      const nDys = Number(minorsRow.nDys);
      const minorPercent = Math.round((nMinor / nAge) * 100);
      const le15Percent = Math.round((Number(minorsRow.nLe15) / nAge) * 100);
      if (minorPercent >= 20) {
        highlights.push({
          type: "minorShare",
          percent: minorPercent,
          n: nMinor,
          total: nAge,
        });
      }
      if (le15Percent >= 15) {
        highlights.push({ type: "minorLe15", percent: le15Percent, n: nAge });
      }
      if (nDys >= minN) {
        const dysPercent = Math.round(
          (Number(minorsRow.nDysChild) / nDys) * 100,
        );
        if (dysPercent >= 20) {
          highlights.push({
            type: "minorDysphoria",
            percent: dysPercent,
            n: nDys,
          });
        }
      }
      if (nMinor >= minN) {
        const femalePercent = Math.round(
          (Number(minorsRow.nMinorFemale) / nMinor) * 100,
        );
        if (femalePercent >= 60) {
          highlights.push({
            type: "minorFemale",
            percent: femalePercent,
            n: nMinor,
          });
        }
      }
    }

    // ── Prevalence leader ──────────────────────────────────────────────────
    const prevalenceRows = Array.from(prevalenceRowsRaw) as Record<
      string,
      unknown
    >[];
    const prevalence = prevalenceRows
      .map((row) => ({
        key: row.key as string,
        label: row.label as string,
        tagName: (row.tagName as string | null) ?? null,
        n: Number(row.n),
        above: Number(row.above),
        uncertain: Number(row.uncertain),
        percent: Number(row.n) > 0 ? Number(row.above) / Number(row.n) : 0,
      }))
      .filter((row) => row.percent >= 0.15)
      .sort((a, b) => b.percent * Math.sqrt(b.n) - a.percent * Math.sqrt(a.n));

    if (prevalence[0]) {
      highlights.push({
        type: "prevalence",
        featureKey: prevalence[0].key,
        label: DISPLAY_LABELS[prevalence[0].key] ?? prevalence[0].label,
        tagName: prevalence[0].tagName,
        percent: Math.round(prevalence[0].percent * 100),
        unclearPercent:
          prevalence[0].n > 0
            ? Math.round((prevalence[0].uncertain / prevalence[0].n) * 100)
            : 0,
        n: prevalence[0].n,
      });
    }

    // ── Strongest pair (lift) between causes and outcomes ─────────────────
    const pairRows = Array.from(pairRowsRaw) as unknown as AnswerRow[];
    const truthByUser = new Map<string, Set<string>>();
    for (const row of pairRows) {
      if (typeof row.noul !== "number" || row.noul < row.threshold) continue;
      let set = truthByUser.get(row.username);
      if (!set) {
        set = new Set();
        truthByUser.set(row.username, set);
      }
      set.add(row.key);
    }
    const users = [...truthByUser.values()];
    const countTrue = (key: string) =>
      users.reduce((sum, set) => sum + (set.has(key) ? 1 : 0), 0);
    const countBoth = (a: string, b: string) =>
      users.reduce((sum, set) => sum + (set.has(a) && set.has(b) ? 1 : 0), 0);

    const labelByKey = new Map<string, string>();
    for (const row of prevalenceRows) {
      const key = row.key as string;
      labelByKey.set(key, DISPLAY_LABELS[key] ?? (row.label as string));
    }

    let bestPair: {
      a: string;
      b: string;
      lift: number;
      percent: number;
      n: number;
    } | null = null;
    for (const causeKey of CAUSE_KEYS) {
      const nA = countTrue(causeKey);
      if (nA < minSide) continue;
      for (const outcomeKey of OUTCOME_KEYS) {
        const nB = countTrue(outcomeKey);
        if (nB < minSide) continue;
        const both = countBoth(causeKey, outcomeKey);
        if (both < minSide) continue;
        const rate = both / nA;
        const base = nB / users.length;
        if (base <= 0) continue;
        const lift = rate / base;
        if (lift < 1.25) continue;
        if (
          !bestPair ||
          lift * Math.log(2 + both) > bestPair.lift * Math.log(2 + bestPair.n)
        ) {
          bestPair = {
            a: causeKey,
            b: outcomeKey,
            lift: Math.round(lift * 100) / 100,
            percent: Math.round(rate * 100),
            n: both,
          };
        }
      }
    }

    if (bestPair) {
      highlights.push({
        type: "pair",
        aKey: bestPair.a,
        aLabel: labelByKey.get(bestPair.a) ?? bestPair.a,
        bKey: bestPair.b,
        bLabel: labelByKey.get(bestPair.b) ?? bestPair.b,
        lift: bestPair.lift,
        percent: bestPair.percent,
        n: bestPair.n,
      });
    }

    // ── Life-after-detransition improvement ───────────────────────────────
    const improvementRows = Array.from(improvementRowsRaw) as unknown as {
      key: string;
      score: number | null;
    }[];

    for (const key of IMPROVEMENT_KEYS) {
      const scores = improvementRows
        .filter((row) => row.key === key)
        .map((row) => row.score)
        .filter((score): score is number => typeof score === "number");
      if (scores.length < minN) continue;
      const better = scores.filter((score) => score >= 3).length;
      const worse = scores.filter((score) => score <= 1).length;
      highlights.push({
        type: "improvement",
        featureKey: key,
        betterPercent: Math.round((better / scores.length) * 100),
        worsePercent: Math.round((worse / scores.length) * 100),
        n: scores.length,
      });
      break;
    }

    // ── Orientation: share gay, lesbian or bisexual (stated only) ─────────
    const [orientationRow] = Array.from(
      await db.execute(sql`
        WITH ${cohortCte(filters)}
        SELECT
          (count(*) FILTER (WHERE a.choice IN ('homosexual', 'bisexual')))::int AS lgb,
          (count(*) FILTER (WHERE a.choice = 'homosexual'))::int AS "sameSex",
          (count(*) FILTER (
            WHERE a.choice IN ('homosexual', 'bisexual', 'heterosexual', 'asexual', 'other')
          ))::int AS stated
        FROM filtered_answers a
        JOIN detrans_features f ON f.id = a.feature_id
        WHERE f.key = 'sexuality_after' AND f.enabled = true
      `),
    ) as unknown as { lgb: number; sameSex: number; stated: number }[];
    if (orientationRow && Number(orientationRow.stated) >= minN) {
      const stated = Number(orientationRow.stated);
      // Lead with it: one of the clearest findings in the dataset.
      highlights.unshift({
        type: "orientation",
        percent: Math.round((Number(orientationRow.lgb) / stated) * 100),
        sameSexPercent: Math.round(
          (Number(orientationRow.sameSex) / stated) * 100,
        ),
        n: stated,
      });
    }

    // ── Typical journey medians ───────────────────────────────────────────
    const [journeyRow] = Array.from(journeyRowsRaw) as unknown as {
      dysphoria: number | null;
      transition: number | null;
      detransition: number | null;
      n: number;
    }[];

    if (
      journeyRow &&
      journeyRow.transition != null &&
      journeyRow.detransition != null
    ) {
      highlights.push({
        type: "journey",
        dysphoria: journeyRow.dysphoria,
        transition: journeyRow.transition,
        detransition: journeyRow.detransition,
        n: journeyRow.n,
      });
    }

    return NextResponse.json(
      { cohort, highlights },
      { headers: FEATURE_CACHE_HEADERS },
    );
  } catch (error) {
    console.error("Error fetching highlights:", error);
    return NextResponse.json(
      { error: "Failed to fetch highlights" },
      { status: 500 },
    );
  }
}
