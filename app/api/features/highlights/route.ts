import { db } from "@/db";
import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { withFeatureCache } from "../cache";
import {
  cohortCte,
  FEATURE_CACHE_HEADERS,
  MEDICAL_TIER_KEYS,
  medicalTier,
  NOUL_THRESHOLD,
  parseFeatureFilters,
} from "../helpers";

/** Regret by most invasive step reached (see medical-gradient). */
const REGRET_LADDER_KEYS = [...MEDICAL_TIER_KEYS, "regret_transition"];

/** The card's copy says "quality of life", so only that question feeds it. */
const IMPROVEMENT_KEYS = ["outcome_quality_of_life"] as const;

/**
 * Men vs women: primary reasons for transitioning that are at least twice
 * as often the main reason for one sex as for the other.
 */
const PRIMARY_REASON_KEY = "primary_transition_reason";
const UNCLEAR_REASONS = ["other_unclear", "unclear"];
const DISTINCTIVE_RATIO = 2;

/**
 * "Exploratory therapy helped → mental health better after detransitioning",
 * computed as in the connections section.
 */
const THERAPY_KEY = "process_benefited_from_therapy";
const MENTAL_HEALTH_KEY = "mh_change_after_detransition";
const MIN_GROUP_N = 30;

/** Matches the views-on-transition chart: stories that address it. */
const ATTITUDE_KEY = "attitude_towards_transition_for_others";
const ATTITUDE_ADDRESSED = ["supportive", "conditional", "critical", "opposed"];
const ATTITUDE_CRITICAL = ["critical", "opposed"];

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
async function getFeature(request: NextRequest) {
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

    // The candidate queries are independent; run them in parallel.
    const [
      prevalenceRowsRaw,
      regretRowsRaw,
      improvementRowsRaw,
      journeyRowsRaw,
      durationRowsRaw,
      minorsRowsRaw,
      attitudeRowsRaw,
      therapyRowsRaw,
      reasonRowsRaw,
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
          )::int AS above
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
          COALESCE(f.threshold, ${NOUL_THRESHOLD})::real AS threshold
        FROM filtered_answers a
        JOIN detrans_features f ON f.id = a.feature_id
        WHERE f.enabled = true
          AND f.kind = 'noul'
          AND f.key IN (${sql.join(
            REGRET_LADDER_KEYS.map((key) => sql`${key}`),
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
      // Years in transition, per sex (year difference, age difference
      // fallback), as in the duration chart.
      db.execute(sql`
        WITH ${cohortCte(filters)},
        durations AS (
          SELECT
            fu.sex,
            COALESCE(
              t.detransition_year - t.transition_year,
              t.detransition_age - t.transition_age
            ) AS years
          FROM latest_timelines t
          JOIN cohort c ON c.username = t.username
          JOIN filtered_users fu ON fu.username = t.username
        )
        SELECT
          percentile_cont(0.5) WITHIN GROUP (ORDER BY years)
            FILTER (WHERE sex = 'f') AS female,
          percentile_cont(0.5) WITHIN GROUP (ORDER BY years)
            FILTER (WHERE sex = 'm') AS male,
          (count(*) FILTER (WHERE sex = 'f'))::int AS "nFemale",
          (count(*) FILTER (WHERE sex = 'm'))::int AS "nMale"
        FROM durations
        WHERE years BETWEEN 0 AND 40
      `),
      db.execute(sql`
        WITH ${cohortCte(filters)}
        SELECT
          count(t.transition_age)::int AS "nAge",
          count(*) FILTER (WHERE t.transition_age < 18)::int AS "nMinor",
          count(t.first_dysphoria_age)::int AS "nDys",
          count(*) FILTER (WHERE t.first_dysphoria_age <= 12)::int AS "nDysChild",
          count(*) FILTER (WHERE t.transition_age < 18 AND fu.sex = 'f')::int AS "nMinorFemale",
          count(t.puberty_blockers_age)::int AS "nBlockers",
          min(t.puberty_blockers_age)::int AS "minBlockers"
        FROM latest_timelines t
        JOIN cohort c ON c.username = t.username
        JOIN filtered_users fu ON fu.username = t.username
      `),
      db.execute(sql`
        WITH ${cohortCte(filters)}
        SELECT a.choice, a.probabilities
        FROM filtered_answers a
        JOIN detrans_features f ON f.id = a.feature_id
        WHERE f.key = ${ATTITUDE_KEY} AND f.enabled = true
      `),
      db.execute(sql`
        WITH ${cohortCte(filters)}
        SELECT
          a.username,
          f.key,
          (a.noul >= COALESCE(f.threshold, ${NOUL_THRESHOLD})) AS v,
          a.score
        FROM filtered_answers a
        JOIN detrans_features f ON f.id = a.feature_id
        WHERE f.enabled = true
          AND f.key IN (${THERAPY_KEY}, ${MENTAL_HEALTH_KEY})
      `),
      db.execute(sql`
        WITH ${cohortCte(filters)}
        SELECT fu.sex, a.choice, count(*)::int AS n
        FROM filtered_answers a
        JOIN detrans_features f ON f.id = a.feature_id
        JOIN filtered_users fu ON fu.username = a.username
        WHERE f.key = ${PRIMARY_REASON_KEY}
          AND f.enabled = true
          AND fu.sex IN ('f', 'm')
          AND a.choice IS NOT NULL
        GROUP BY fu.sex, a.choice
      `),
    ]);

    const highlights: Record<string, unknown>[] = [];

    // ── Started young (headline stats from the timeline data) ─────────────
    const [minorsRow] = Array.from(minorsRowsRaw) as unknown as {
      nAge: number;
      nMinor: number;
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
      if (minorPercent >= 20) {
        highlights.push({
          type: "minorShare",
          percent: minorPercent,
          n: nMinor,
          total: nAge,
        });
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
        percent: Number(row.n) > 0 ? Number(row.above) / Number(row.n) : 0,
      }))
      .filter((row) => row.percent >= 0.15)
      .sort((a, b) => b.percent * Math.sqrt(b.n) - a.percent * Math.sqrt(a.n));

    const leader = prevalence[0];
    if (leader) {
      highlights.push({
        type: "prevalence",
        featureKey: leader.key,
        label: DISPLAY_LABELS[leader.key] ?? leader.label,
        tagName: leader.tagName,
        percent: Math.round(leader.percent * 100),
        n: leader.n,
      });
    }

    // ── Primary reasons for transitioning, women vs men ──────────────────
    const reasonRows = (
      Array.from(reasonRowsRaw) as unknown as {
        sex: "f" | "m";
        choice: string;
        n: number;
      }[]
    ).filter((row) => !UNCLEAR_REASONS.includes(row.choice));
    const reasonCounts = {
      f: new Map<string, number>(),
      m: new Map<string, number>(),
    };
    for (const row of reasonRows)
      reasonCounts[row.sex].set(row.choice, Number(row.n));
    const reasonTotal = (sex: "f" | "m") =>
      [...reasonCounts[sex].values()].reduce((sum, n) => sum + n, 0);
    const nWomen = reasonTotal("f");
    const nMen = reasonTotal("m");
    if (nWomen >= minN && nMen >= minN) {
      // Most distinctive first.
      const distinctiveReasons = (sex: "f" | "m", total: number) => {
        const other = sex === "f" ? "m" : "f";
        const otherTotal = sex === "f" ? nMen : nWomen;
        return [...reasonCounts[sex].entries()]
          .filter(([, n]) => n >= minSide)
          .map(([key, n]) => {
            const otherShare = (reasonCounts[other].get(key) ?? 0) / otherTotal;
            return { key, ratio: n / total / Math.max(otherShare, 1e-9) };
          })
          .filter((reason) => reason.ratio >= DISTINCTIVE_RATIO)
          .sort((a, b) => b.ratio - a.ratio)
          .map((reason) => reason.key);
      };
      const men = distinctiveReasons("m", nMen);
      const women = distinctiveReasons("f", nWomen);
      if (men.length > 0 || women.length > 0) {
        highlights.push({ type: "reasonsBySex", men, women, nMen, nWomen });
      }
    }

    // ── Exploratory therapy helped → mental health better ────────────────
    const therapyRows = Array.from(therapyRowsRaw) as unknown as {
      username: string;
      key: string;
      v: boolean | null;
      score: number | null;
    }[];
    const therapyByUser = new Map<string, boolean>();
    const mentalBetterByUser = new Map<string, boolean>();
    for (const row of therapyRows) {
      if (row.key === THERAPY_KEY && row.v != null) {
        therapyByUser.set(row.username, row.v);
      } else if (
        row.key === MENTAL_HEALTH_KEY &&
        typeof row.score === "number"
      ) {
        // Scores run 0-4 (much worse ... much better); 3+ is "better".
        mentalBetterByUser.set(row.username, Math.round(row.score) >= 3);
      }
    }
    const therapy = {
      with: { n: 0, better: 0 },
      without: { n: 0, better: 0 },
    };
    for (const [username, helped] of therapyByUser) {
      const better = mentalBetterByUser.get(username);
      if (better == null) continue;
      const bucket = helped ? therapy.with : therapy.without;
      bucket.n += 1;
      if (better) bucket.better += 1;
    }
    if (therapy.with.n >= MIN_GROUP_N && therapy.without.n >= MIN_GROUP_N) {
      highlights.push({
        type: "therapyMentalHealth",
        withPercent: Math.round((therapy.with.better / therapy.with.n) * 100),
        withoutPercent: Math.round(
          (therapy.without.better / therapy.without.n) * 100,
        ),
        nWith: therapy.with.n,
        nWithout: therapy.without.n,
      });
    }

    // ── Critical of transition for others (probability-weighted) ──────────
    const attitudeRows = Array.from(attitudeRowsRaw) as unknown as {
      choice: string | null;
      probabilities: Record<string, unknown> | null;
    }[];
    let addressed = 0;
    let critical = 0;
    for (const row of attitudeRows) {
      const weights: Record<string, unknown> =
        row.probabilities && typeof row.probabilities === "object"
          ? row.probabilities
          : row.choice
            ? { [row.choice]: 1 }
            : {};
      for (const [option, weight] of Object.entries(weights)) {
        if (typeof weight !== "number") continue;
        if (ATTITUDE_ADDRESSED.includes(option)) addressed += weight;
        if (ATTITUDE_CRITICAL.includes(option)) critical += weight;
      }
    }
    if (addressed >= minN) {
      highlights.push({
        type: "criticalOfTransition",
        percent: Math.round((critical / addressed) * 100),
        n: Math.round(addressed),
      });
    }

    // ── Regret rises with medical involvement ─────────────────────────────
    const regretRows = Array.from(regretRowsRaw) as unknown as AnswerRow[];
    const truthByUser = new Map<string, Set<string>>();
    for (const row of regretRows) {
      let set = truthByUser.get(row.username);
      if (!set) {
        set = new Set();
        truthByUser.set(row.username, set);
      }
      if (typeof row.noul === "number" && row.noul >= row.threshold) {
        set.add(row.key);
      }
    }
    const ladder = {
      social_only: { n: 0, regret: 0 },
      hormones: { n: 0, regret: 0 },
      surgery: { n: 0, regret: 0 },
    };
    for (const set of truthByUser.values()) {
      const tier = medicalTier((key) => set.has(key));
      if (!(tier in ladder)) continue;
      const bucket = ladder[tier as keyof typeof ladder];
      bucket.n += 1;
      if (set.has("regret_transition")) bucket.regret += 1;
    }
    const rungs = Object.values(ladder);
    const share = (bucket: { n: number; regret: number }) =>
      Math.round((bucket.regret / bucket.n) * 100);
    if (rungs.every((bucket) => bucket.n >= minSide)) {
      const socialOnly = share(ladder.social_only);
      const surgery = share(ladder.surgery);
      // Only a finding when regret actually climbs with involvement.
      if (surgery - socialOnly >= 10) {
        highlights.push({
          type: "regretLadder",
          socialOnly,
          hormones: share(ladder.hormones),
          surgery,
          n: rungs.reduce((sum, bucket) => sum + bucket.n, 0),
        });
      }
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
      // Scores are continuous (0-4); bucket to the nearest level like the
      // after-detransition chart so the card matches the bars.
      const levels = scores.map((score) => Math.round(score));
      const better = levels.filter((level) => level >= 3).length;
      const worse = levels.filter((level) => level <= 1).length;
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
      highlights.push({
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

    const [durationRow] = Array.from(durationRowsRaw) as unknown as {
      female: number | null;
      male: number | null;
      nFemale: number;
      nMale: number;
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

    // ── Median time in transition, women vs men ──────────────────────────
    if (
      durationRow &&
      durationRow.female != null &&
      durationRow.male != null &&
      Number(durationRow.nFemale) >= minSide &&
      Number(durationRow.nMale) >= minSide
    ) {
      highlights.push({
        type: "durationBySex",
        female: Number(durationRow.female),
        male: Number(durationRow.male),
        nFemale: Number(durationRow.nFemale),
        nMale: Number(durationRow.nMale),
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

export const GET = withFeatureCache(getFeature);
