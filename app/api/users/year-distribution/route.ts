import { NextRequest, NextResponse } from "next/server";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql, eq, and, inArray } from "drizzle-orm";
import postgres from "postgres";
import { detransUsers, detransTags, detransUserTags } from "@/db/schema";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/app";
const client = postgres(connectionString);
const db = drizzle(client);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const minYear = parseInt(searchParams.get("minYear") || "2000");
    const maxYear = parseInt(searchParams.get("maxYear") || "2024");
    const sex = searchParams.get("sex");
    const tag = searchParams.get("tag");

    // Build where conditions for filtering
    const conditions = [];
    
    if (sex && (sex === "m" || sex === "f")) {
      conditions.push(sql`${detransUsers.sex} = ${sex}`);
    }

    // Handle tag filtering
    let userFilterSubquery = sql``;
    if (tag) {
      const tagNames = tag.split(',').map(t => t.trim()).filter(Boolean);
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
            .where(inArray(detransUserTags.tagId, tagIds.map(t => t.id)))
            .groupBy(detransUserTags.username)
            .having(sql`COUNT(DISTINCT ${detransUserTags.tagId}) = ${tagIds.length}`);
          
          if (usersWithAllTags.length > 0) {
            conditions.push(sql`${detransUsers.username} IN (${sql.join(usersWithAllTags.map(u => sql`${u.username}`), sql`, `)})`);
          } else {
            // No users have all the requested tags, return empty result
            return NextResponse.json({ data: [] });
          }
        }
      }
    }

    const whereClause = conditions.length > 0 ? sql`AND ${sql.join(conditions, sql` AND `)}` : sql``;

    // Get transition year distribution
    const transitionYears = await db.execute(sql`
      SELECT 
        transition_year as year,
        COUNT(*) as count
      FROM detrans_users 
      WHERE transition_year IS NOT NULL 
        AND transition_year >= ${minYear} 
        AND transition_year <= ${maxYear}
        ${whereClause}
      GROUP BY transition_year 
      ORDER BY transition_year
    `);

    // Get detransition year distribution
    const detransitionYears = await db.execute(sql`
      SELECT 
        detransition_year as year,
        COUNT(*) as count
      FROM detrans_users 
      WHERE detransition_year IS NOT NULL 
        AND detransition_year >= ${minYear} 
        AND detransition_year <= ${maxYear}
        ${whereClause}
      GROUP BY detransition_year 
      ORDER BY detransition_year
    `);

    // Create a complete year range with zeros for missing years
    const yearData: { [key: number]: { transition: number; detransition: number } } = {};
    
    for (let year = minYear; year <= maxYear; year++) {
      yearData[year] = { transition: 0, detransition: 0 };
    }

    // Fill in transition data
    transitionYears.forEach((row) => {
      const year = Number(row.year);
      if (year >= minYear && year <= maxYear) {
        yearData[year].transition = Number(row.count);
      }
    });

    // Fill in detransition data
    detransitionYears.forEach((row) => {
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
      { status: 500 }
    );
  }
}
