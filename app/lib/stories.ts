/**
 * Server-side story lookups for the canonical story pages and the sitemap.
 *
 * Stories are keyed by a short salted username hash (see story-id.ts; the
 * same id the spotlight API hands out), so usernames never leave the server.
 * A story is "listed" when it would appear in the /stories spotlight with the
 * default filters: confirmed detransition/desistance, not flagged suspicious,
 * enough text, and not rated as having no detail. Only listed stories are indexed and
 * included in the sitemap; other stories still render but are noindex.
 */

import { db } from "@/db";
import { locales } from "@/i18n/locales";
import { sql, type SQL } from "drizzle-orm";
import { cache } from "react";
import { storyIdSql } from "./story-id";
import { storySlug } from "./story-urls";

const STORY_ID_PATTERN = /^[0-9a-f]{8}$/;
const MIN_STORY_LENGTH = 120;
const SUSPICIOUS_TAG = "suspicious account";

export interface StoryTag {
  name: string;
  translations: Record<string, string>;
}

export interface StoryPageData {
  id: string;
  slug: string;
  /** English title; also the source of the URL slug. */
  title: string | null;
  titleTranslations: Record<string, string>;
  sex: "m" | "f" | null;
  status: "detransitioned" | "desisted" | null;
  summary: string | null;
  summaryTranslations: Record<string, string>;
  experience: string | null;
  experienceTranslations: Record<string, string>;
  ages: {
    firstDysphoria: number | null;
    transition: number | null;
    detransition: number | null;
  };
  upvotes: number;
  tags: StoryTag[];
  updatedAt: Date | null;
  /** Shown in the /stories spotlight; only these are indexed. */
  listed: boolean;
  /** Locales with a translated summary (always includes "en"). */
  translatedLocales: string[];
}

export interface StorySitemapEntry {
  slug: string;
  updatedAt: Date | null;
  translatedLocales: string[];
}

function parseTranslations(json: string | null): Record<string, string> {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] =>
          typeof entry[1] === "string" && entry[1].trim().length > 0,
      ),
    );
  } catch {
    return {};
  }
}

function translatedLocalesOf(translations: Record<string, string>): string[] {
  const available = locales as readonly string[];
  return [
    "en",
    ...Object.keys(translations).filter(
      (locale) => locale !== "en" && available.includes(locale),
    ),
  ];
}

/**
 * Listing flags for one user from their newest feature answers, matching the
 * spotlight's cohort rules (see app/api/features/helpers.ts).
 */
function storyFlagsLateral(username: SQL): SQL {
  return sql`
    LEFT JOIN LATERAL (
      SELECT
        bool_or(f.key = 'current_status' AND a.choice IN ('detransitioned', 'desisted')) AS has_status,
        max(a.choice) FILTER (WHERE f.key = 'current_status') AS status,
        bool_or(f.key = 'quality_suspicious_account' AND a.noul >= COALESCE(f.threshold, 0.6)) AS suspicious,
        bool_or(f.key = 'quality_detail_level' AND f.enabled AND a.score < 1) AS low_detail
      FROM (
        SELECT DISTINCT ON (uf.feature_id) uf.feature_id, uf.choice, uf.noul, uf.score
        FROM detrans_user_features uf
        WHERE uf.username = ${username}
          AND uf.feature_id IN (
            SELECT id FROM detrans_features
            WHERE key IN ('current_status', 'quality_suspicious_account', 'quality_detail_level')
          )
        ORDER BY uf.feature_id, uf.run_id DESC
      ) a
      JOIN detrans_features f ON f.id = a.feature_id
    ) flags ON true
  `;
}

/** Full story for the canonical page, or null if unknown / has no text. */
export const getStory = cache(
  async (id: string): Promise<StoryPageData | null> => {
    if (!STORY_ID_PATTERN.test(id)) return null;

    const rows = Array.from(
      await db.execute(sql`
        WITH target AS (
          SELECT username FROM (
            SELECT username FROM detrans_user_profiles
            WHERE ${storyIdSql(sql`username`)} = ${id}
            UNION
            SELECT username FROM detrans_users
            WHERE ${storyIdSql(sql`username`)} = ${id}
          ) candidates
          ORDER BY username
          LIMIT 1
        )
        SELECT
          dn.display_name AS title,
          dn.display_name_translation AS "titleTranslation",
          COALESCE(p.sex, u.sex) AS sex,
          COALESCE(u.experience_summary, p.experience_summary) AS summary,
          u.experience_summary_translation AS "summaryTranslation",
          COALESCE(u.experience, p.experience) AS experience,
          u.experience_translation AS "experienceTranslation",
          tl.first_dysphoria_age AS "firstDysphoriaAge",
          COALESCE(tl.transition_age, u.transition_age) AS "transitionAge",
          COALESCE(tl.detransition_age, u.detransition_age) AS "detransitionAge",
          GREATEST(p.created_at, tl.created_at) AS "updatedAt",
          flags.status,
          (
            flags.has_status IS TRUE
            AND flags.suspicious IS NOT TRUE
            AND flags.low_detail IS NOT TRUE
            AND length(COALESCE(p.experience_summary, p.experience, '')) >= ${MIN_STORY_LENGTH}
          ) AS listed,
          (
            SELECT COALESCE(SUM(i.score), 0)::int
            FROM (
              SELECT score FROM detrans_comments WHERE username = t.username
              UNION ALL
              SELECT score FROM detrans_posts WHERE username = t.username
            ) i
          ) AS upvotes,
          (
            SELECT COALESCE(
              json_agg(json_build_object('name', tag.name, 'translation', tag.name_translation) ORDER BY tag.name),
              '[]'::json
            )
            FROM detrans_user_tags ut
            JOIN detrans_tags tag ON tag.id = ut.tag_id
            WHERE ut.username = t.username
              AND tag.name <> ${SUSPICIOUS_TAG}
          ) AS tags
        FROM target t
        LEFT JOIN LATERAL (
          SELECT sex, experience, experience_summary, created_at
          FROM detrans_user_profiles
          WHERE username = t.username
          ORDER BY run_id DESC
          LIMIT 1
        ) p ON true
        LEFT JOIN LATERAL (
          SELECT first_dysphoria_age, transition_age, detransition_age, created_at
          FROM detrans_user_timelines
          WHERE username = t.username
          ORDER BY run_id DESC
          LIMIT 1
        ) tl ON true
        LEFT JOIN detrans_users u ON u.username = t.username
        LEFT JOIN detrans_user_display_names dn ON dn.username = t.username
        ${storyFlagsLateral(sql`t.username`)}
      `),
    ) as unknown as {
      title: string | null;
      titleTranslation: string | null;
      sex: string | null;
      summary: string | null;
      summaryTranslation: string | null;
      experience: string | null;
      experienceTranslation: string | null;
      firstDysphoriaAge: number | null;
      transitionAge: number | null;
      detransitionAge: number | null;
      updatedAt: Date | string | null;
      status: string | null;
      listed: boolean;
      upvotes: number;
      tags: { name: string; translation: string | null }[];
    }[];

    const row = rows[0];
    if (!row || (!row.summary && !row.experience)) return null;

    const summaryTranslations = parseTranslations(row.summaryTranslation);
    return {
      id,
      slug: storySlug(id, row.title),
      title: row.title,
      titleTranslations: parseTranslations(row.titleTranslation),
      sex: row.sex === "m" || row.sex === "f" ? row.sex : null,
      status:
        row.status === "detransitioned" || row.status === "desisted"
          ? row.status
          : null,
      summary: row.summary,
      summaryTranslations,
      experience: row.experience,
      experienceTranslations: parseTranslations(row.experienceTranslation),
      ages: {
        firstDysphoria: row.firstDysphoriaAge,
        transition: row.transitionAge,
        detransition: row.detransitionAge,
      },
      upvotes: row.upvotes ?? 0,
      tags: row.tags.map((tag) => ({
        name: tag.name,
        translations: parseTranslations(tag.translation),
      })),
      updatedAt: row.updatedAt ? new Date(row.updatedAt) : null,
      listed: row.listed === true,
      translatedLocales: translatedLocalesOf(summaryTranslations),
    };
  },
);

/** Every listed story, for the sitemap. */
export async function getListedStories(): Promise<StorySitemapEntry[]> {
  const rows = Array.from(
    await db.execute(sql`
      SELECT
        ${storyIdSql(sql`p.username`)} AS id,
        dn.display_name AS title,
        p.created_at AS "updatedAt",
        u.experience_summary_translation AS "summaryTranslation"
      FROM (
        SELECT DISTINCT ON (username) username, experience, experience_summary, created_at
        FROM detrans_user_profiles
        ORDER BY username, run_id DESC
      ) p
      LEFT JOIN detrans_users u ON u.username = p.username
      LEFT JOIN detrans_user_display_names dn ON dn.username = p.username
      ${storyFlagsLateral(sql`p.username`)}
      WHERE flags.has_status IS TRUE
        AND flags.suspicious IS NOT TRUE
        AND flags.low_detail IS NOT TRUE
        AND length(COALESCE(p.experience_summary, p.experience, '')) >= ${MIN_STORY_LENGTH}
      ORDER BY id
    `),
  ) as unknown as {
    id: string;
    title: string | null;
    updatedAt: Date | string | null;
    summaryTranslation: string | null;
  }[];

  return rows.map((row) => ({
    slug: storySlug(row.id, row.title),
    updatedAt: row.updatedAt ? new Date(row.updatedAt) : null,
    translatedLocales: translatedLocalesOf(
      parseTranslations(row.summaryTranslation),
    ),
  }));
}
