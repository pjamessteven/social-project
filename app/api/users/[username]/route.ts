import { NextRequest, NextResponse } from "next/server";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { detransUsers } from "../../../../db/schema";
import { eq } from "drizzle-orm";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/app";
const client = postgres(connectionString);
const db = drizzle(client);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    
    const user = await db
      .select()
      .from(detransUsers)
      .where(eq(detransUsers.username, decodeURIComponent(username)))
      .limit(1);

    if (user.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Parse tags
    const userWithParsedTags = {
      ...user[0],
      tags: user[0].tags ? JSON.parse(user[0].tags) : []
    };

    return NextResponse.json({ user: userWithParsedTags });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}
