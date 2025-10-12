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
    const minAge = parseInt(searchParams.get("minAge") || "10");
    const maxAge = parseInt(searchParams.get("maxAge") || "50");
    const sex = searchParams.get("sex");
    const tag = searchParams.get("tag");

    // Build where conditions for filtering
    const conditions = [];
    
    if (sex && (sex === "m" || sex === "f")) {
      conditions.push(sql`${detransUsers.sex} = ${sex}`);
    }


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

    // Get transition age distribution
    const transitionAges = await db.execute(sql`
      SELECT 
        transition_age as age,
        COUNT(*) as count
      FROM detrans_users 
      WHERE transition_age IS NOT NULL 
        AND transition_age >= ${minAge} 
        AND transition_age <= ${maxAge}
        ${whereClause}
      GROUP BY transition_age 
      ORDER BY transition_age
    `);

    // Get detransition age distribution
    const detransitionAges = await db.execute(sql`
      SELECT 
        detransition_age as age,
        COUNT(*) as count
      FROM detrans_users 
      WHERE detransition_age IS NOT NULL 
        AND detransition_age >= ${minAge} 
        AND detransition_age <= ${maxAge}
        ${whereClause}
      GROUP BY detransition_age 
      ORDER BY detransition_age
    `);

    // Create a complete age range with zeros for missing ages
    const ageData: { [key: number]: { transition: number; detransition: number } } = {};
    
    for (let age = minAge; age <= maxAge; age++) {
      ageData[age] = { transition: 0, detransition: 0 };
    }

    // Fill in transition data
    transitionAges.forEach((row) => {
      const age = Number(row.age);
      if (age >= minAge && age <= maxAge) {
        ageData[age].transition = Number(row.count);
      }
    });

    // Fill in detransition data
    detransitionAges.forEach((row) => {
      const age = Number(row.age);
      if (age >= minAge && age <= maxAge) {
        ageData[age].detransition = Number(row.count);
      }
    });

    // Convert to array format for the chart
    const chartData = Object.entries(ageData).map(([age, counts]) => ({
      age: parseInt(age),
      transition: counts.transition,
      detransition: -counts.detransition, // Negative values to show below center line
    }));

    return NextResponse.json({ data: chartData });
  } catch (error) {
    console.error("Error fetching age distribution:", error);
    return NextResponse.json(
      { error: "Failed to fetch age distribution" },
      { status: 500 }
    );
  }
}
