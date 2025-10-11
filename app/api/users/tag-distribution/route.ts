import { NextRequest, NextResponse } from "next/server";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql, eq, and, inArray } from "drizzle-orm";
import postgres from "postgres";
import { detransUsers, detransTags, detransUserTags } from "@/db/schema";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/app";
const client = postgres(connectionString);
const db = drizzle(client);

// Tag mappings for Sankey flow
const TAG_MAPPINGS = {
  sexuality: {
    "homosexual": "homosexual",
    "heterosexual": "heterosexual", 
    "bisexual": "bisexual",
    "asexual": "asexual"
  },
  medical: {
    "took hormones": "took_hormones",
    "got top surgery": "got_top_surgery", 
    "got bottom surgery": "got_bottom_surgery",
    "only transitioned socially": "social_only"
  },
  outcome: {
    "regrets transitioning": "regrets_transitioning",
    "doesn't regret transitioning": "doesnt_regret_transitioning"
  }
};

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
      conditions.push(sql`u.sex = ${sex}`);
    }

    // Handle tag filtering
    let tagFilterClause = sql``;
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
            conditions.push(sql`u.username IN (${sql.join(usersWithAllTags.map(u => sql`${u.username}`), sql`, `)})`);
          } else {
            // No users have all the requested tags, return empty result
            return NextResponse.json({ data: { nodes: [], links: [] } });
          }
        }
      }
    }

    // Get all users with their tags and computed categories
    let usersWithTags;
    if (conditions.length > 0) {
      const whereClause = sql.join(conditions, sql` AND `);
      usersWithTags = await db.execute(sql`
        SELECT 
          u.username,
          u.sex,
          u.transition_age,
          ARRAY_AGG(t.name) FILTER (WHERE t.name IS NOT NULL) as tags
        FROM detrans_users u
        LEFT JOIN detrans_user_tags ut ON u.username = ut.username  
        LEFT JOIN detrans_tags t ON ut.tag_id = t.id
        WHERE ${whereClause}
        GROUP BY u.username, u.sex, u.transition_age
      `);
    } else {
      usersWithTags = await db.execute(sql`
        SELECT 
          u.username,
          u.sex,
          u.transition_age,
          ARRAY_AGG(t.name) FILTER (WHERE t.name IS NOT NULL) as tags
        FROM detrans_users u
        LEFT JOIN detrans_user_tags ut ON u.username = ut.username  
        LEFT JOIN detrans_tags t ON ut.tag_id = t.id
        GROUP BY u.username, u.sex, u.transition_age
      `);
    }

    // Process users into Sankey nodes and links
    const sankeyData = processSankeyData(usersWithTags);

    return NextResponse.json({ data: sankeyData });
  } catch (error) {
    console.error("Error fetching tag distribution:", error);
    return NextResponse.json(
      { error: "Failed to fetch tag distribution" },
      { status: 500 }
    );
  }
}

function processSankeyData(users: any[]) {
  const nodes: { id: string; label: string; stage: number }[] = [];
  const links: { source: string; target: string; value: number }[] = [];
  
  // Create nodes for each stage
  const stages = [
    { name: "sex", categories: ["male", "female", "unknown"] },
    { name: "sexuality", categories: ["homosexual", "heterosexual", "bisexual", "asexual", "unknown"] },
    { name: "transition_age", categories: ["before_18", "after_18", "unknown"] },
    { name: "medical", categories: ["took_hormones", "got_surgery", "social_only", "unknown"] },
    { name: "outcome", categories: ["regrets", "no_regrets", "unknown"] }
  ];

  stages.forEach((stage, stageIndex) => {
    stage.categories.forEach(category => {
      nodes.push({
        id: `${stage.name}_${category}`,
        label: category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        stage: stageIndex
      });
    });
  });

  // Process each user through the flow
  const flowCounts = new Map<string, number>();

  users.forEach(user => {
    const userFlow = categorizeUser(user);
    
    // Create links between consecutive stages
    for (let i = 0; i < userFlow.length - 1; i++) {
      const source = userFlow[i];
      const target = userFlow[i + 1];
      const linkKey = `${source}->${target}`;
      
      flowCounts.set(linkKey, (flowCounts.get(linkKey) || 0) + 1);
    }
  });

  // Convert flow counts to links
  flowCounts.forEach((value, key) => {
    const [source, target] = key.split('->');
    links.push({ source, target, value });
  });

  return { nodes, links };
}

function categorizeUser(user: any): string[] {
  const tags = user.tags || [];
  const flow: string[] = [];

  // Stage 1: Sex
  flow.push(`sex_${user.sex?.toLowerCase() || 'unknown'}`);

  // Stage 2: Sexuality
  const sexuality = tags.find((tag: string) => 
    ['homosexual', 'heterosexual', 'bisexual', 'asexual'].includes(tag)
  ) || 'unknown';
  flow.push(`sexuality_${sexuality}`);

  // Stage 3: Transition Age
  const ageCategory = user.transition_age && user.transition_age < 18 ? 'before_18' : 
                     user.transition_age && user.transition_age >= 18 ? 'after_18' : 'unknown';
  flow.push(`transition_age_${ageCategory}`);

  // Stage 4: Medical Interventions
  const hasHormones = tags.includes('took hormones');
  const hasTopSurgery = tags.includes('got top surgery');
  const hasBottomSurgery = tags.includes('got bottom surgery');
  const socialOnly = tags.includes('only transitioned socially');
  
  let medicalCategory = 'unknown'; // Default to unknown
  
  // Priority order: surgery > hormones > social only
  if (hasTopSurgery || hasBottomSurgery) {
    medicalCategory = 'got_surgery'; // Surgery implies hormones too
  } else if (hasHormones) {
    medicalCategory = 'took_hormones';
  } else if (socialOnly) {
    medicalCategory = 'social_only';
  }
  
  flow.push(`medical_${medicalCategory}`);

  // Stage 5: Outcome
  const regrets = tags.includes('regrets transitioning');
  const noRegrets = tags.includes("doesn't regret transitioning");
  
  let outcome = 'unknown';
  if (regrets) {
    outcome = 'regrets';
  } else if (noRegrets) {
    outcome = 'no_regrets';
  }
  
  flow.push(`outcome_${outcome}`);

  return flow;
}
