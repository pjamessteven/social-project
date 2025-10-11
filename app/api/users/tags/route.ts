import { NextResponse } from "next/server";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { detransUsers } from "../../../../db/schema";
import { sql } from "drizzle-orm";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/app";
const client = postgres(connectionString);
const db = drizzle(client);

export async function GET() {
  try {
    // Get all unique tags from the database
    const result = await db.execute(sql`
      SELECT DISTINCT jsonb_array_elements_text(tags::jsonb) as tag
      FROM detrans_users 
      WHERE tags IS NOT NULL AND tags != 'null'
      ORDER BY tag
    `);

    const tags = result.map(row => row.tag as string);

    return NextResponse.json({ tags });
  } catch (error) {
    console.error("Error fetching tags:", error);
    return NextResponse.json(
      { error: "Failed to fetch tags" },
      { status: 500 }
    );
  }
}
