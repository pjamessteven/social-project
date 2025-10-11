import { NextRequest, NextResponse } from "next/server";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import { detransUsers } from "@/db/schema";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/app";
const client = postgres(connectionString);
const db = drizzle(client);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const minAge = parseInt(searchParams.get("minAge") || "10");
    const maxAge = parseInt(searchParams.get("maxAge") || "50");

    // Get transition age distribution
    const transitionAges = await db.execute(sql`
      SELECT 
        transition_age as age,
        COUNT(*) as count
      FROM detrans_users 
      WHERE transition_age IS NOT NULL 
        AND transition_age >= ${minAge} 
        AND transition_age <= ${maxAge}
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
