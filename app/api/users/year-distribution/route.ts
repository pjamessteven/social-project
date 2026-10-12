import { db } from "@/db";
import { detransTags, detransUsers, detransUserTags } from "@/db/schema";
import { inArray, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// Year data lives in the profile-processing timelines. Resolve the largest
// profiles run (the full cohort) so small pilot runs can never shadow it.
const CURRENT_PROFILES_RUN = sql`(
  SELECT run_id
  FROM detrans_user_timelines
  GROUP BY run_id
  ORDER BY COUNT(*) DESC, run_id DESC
  LIMIT 1
)`;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nowYear = new Date().getFullYear();
    const minYear = Math.max(
      Math.min(parseInt(searchParams.get("minYear") || "2000") || 2000, 2100),
      1900,
    );
    const maxYear = Math.max(
      Math.min(
        parseInt(searchParams.get("maxYear") || String(nowYear)) || nowYear,
        2100,
      ),
      minYear,
    );
    const minAge = Math.max(
      parseInt(searchParams.get("minAge") || "10") || 10,
      0,
    );
    const maxAge = Math.max(
      parseInt(searchParams.get("maxAge") || "50") || 50,
      minAge,
    );
    const sex = searchParams.get("sex");
    const tag = searchParams.get("tag");

    // Build where conditions for filtering
    const conditions = [];

    if (sex && (sex === "m" || sex === "f")) {
      conditions.push(sql`${detransUsers.sex} = ${sex}`);
    }

    // Age filter mirrors tag-distribution: users without a recorded age stay in.
    conditions.push(
      sql`(${detransUsers.transitionAge} IS NULL OR (${detransUsers.transitionAge} >= ${minAge} AND ${detransUsers.transitionAge} <= ${maxAge}))`,
    );

    if (tag) {
      const tagNames = tag
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      if (tagNames.length > 0) {
        // Get tag IDs for the requested tag names
        const tagIds = await db
          .select({ id: detransTags.id })
          .from(detransTags)
          .where(inArray(detransTags.name, tagNames));

        if (tagIds.length > 0) {
          // Find users who have ALL the requested tags
          const usersWithAllTags = await db
            .select({ username: detransUserTags.username })
            .from(detransUserTags)
            .where(
              inArray(
                detransUserTags.tagId,
                tagIds.map((t) => t.id),
              ),
            )
            .groupBy(detransUserTags.username)
            .having(
              sql`COUNT(DISTINCT ${detransUserTags.tagId}) = ${tagIds.length}`,
            );

          if (usersWithAllTags.length > 0) {
            conditions.push(
              sql`${detransUsers.username} IN (${sql.join(
                usersWithAllTags.map((u) => sql`${u.username}`),
                sql`, `,
              )})`,
            );
          } else {
            // No users have all the requested tags, return empty result
            return NextResponse.json({ data: [] });
          }
        }
      }
    }

    const whereClause = sql`AND ${sql.join(conditions, sql` AND `)}`;

    // Get transition year distribution
    const transitionYears = await db.execute(sql`
      SELECT
        detrans_user_timelines.transition_year AS year,
        COUNT(*) AS count
      FROM detrans_users
      JOIN detrans_user_timelines
        ON detrans_user_timelines.username = detrans_users.username
       AND detrans_user_timelines.run_id = ${CURRENT_PROFILES_RUN}
      WHERE detrans_user_timelines.transition_year IS NOT NULL
        AND detrans_user_timelines.transition_year >= ${minYear}
        AND detrans_user_timelines.transition_year <= ${maxYear}
        ${whereClause}
      GROUP BY detrans_user_timelines.transition_year
      ORDER BY detrans_user_timelines.transition_year
    `);

    // Get detransition year distribution
    const detransitionYears = await db.execute(sql`
      SELECT
        detrans_user_timelines.detransition_year AS year,
        COUNT(*) AS count
      FROM detrans_users
      JOIN detrans_user_timelines
        ON detrans_user_timelines.username = detrans_users.username
       AND detrans_user_timelines.run_id = ${CURRENT_PROFILES_RUN}
      WHERE detrans_user_timelines.detransition_year IS NOT NULL
        AND detrans_user_timelines.detransition_year >= ${minYear}
        AND detrans_user_timelines.detransition_year <= ${maxYear}
        ${whereClause}
      GROUP BY detrans_user_timelines.detransition_year
      ORDER BY detrans_user_timelines.detransition_year
    `);

    // Create a complete year range with zeros for missing years
    const yearData: {
      [key: number]: { transition: number; detransition: number };
    } = {};

    for (let year = minYear; year <= maxYear; year++) {
      yearData[year] = { transition: 0, detransition: 0 };
    }

    // Fill in transition data
    transitionYears.forEach((row: any) => {
      const year = Number(row.year);
      if (year >= minYear && year <= maxYear) {
        yearData[year].transition = Number(row.count);
      }
    });

    // Fill in detransition data
    detransitionYears.forEach((row: any) => {
      const year = Number(row.year);
      if (year >= minYear && year <= maxYear) {
        yearData[year].detransition = Number(row.count);
      }
    });

    // Convert to array format for the chart
    const chartData = Object.entries(yearData).map(([year, counts]) => ({
      year: parseInt(year),
      transition: counts.transition,
      detransition: counts.detransition,
    }));

    return NextResponse.json({ data: chartData });
  } catch (error) {
    console.error("Error fetching year distribution:", error);
    return NextResponse.json(
      { error: "Failed to fetch year distribution" },
      { status: 500 },
    );
  }
}
