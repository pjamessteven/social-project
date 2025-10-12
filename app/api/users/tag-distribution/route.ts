import { NextRequest, NextResponse } from "next/server";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql, eq, and, inArray } from "drizzle-orm";
import postgres from "postgres";
import { detransUsers, detransTags, detransUserTags } from "@/db/schema";
import { availableTags } from "@/app/lib/availableTags";

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

    // Add age filtering
    if (minAge) {
      conditions.push(sql`u.transition_age >= ${minAge}`);
    }
    if (maxAge) {
      conditions.push(sql`u.transition_age <= ${maxAge}`);
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
          u.hormones_age,
          u.top_surgery_age,
          u.bottom_surgery_age,
          u.puberty_blockers_age,
          ARRAY_AGG(t.name) FILTER (WHERE t.name IS NOT NULL) as tags
        FROM detrans_users u
        LEFT JOIN detrans_user_tags ut ON u.username = ut.username  
        LEFT JOIN detrans_tags t ON ut.tag_id = t.id
        WHERE ${whereClause}
        GROUP BY u.username, u.sex, u.transition_age, u.hormones_age, u.top_surgery_age, u.bottom_surgery_age, u.puberty_blockers_age
      `);
    } else {
      usersWithTags = await db.execute(sql`
        SELECT 
          u.username,
          u.sex,
          u.transition_age,
          u.hormones_age,
          u.top_surgery_age,
          u.bottom_surgery_age,
          u.puberty_blockers_age,
          ARRAY_AGG(t.name) FILTER (WHERE t.name IS NOT NULL) as tags
        FROM detrans_users u
        LEFT JOIN detrans_user_tags ut ON u.username = ut.username  
        LEFT JOIN detrans_tags t ON ut.tag_id = t.id
        GROUP BY u.username, u.sex, u.transition_age, u.hormones_age, u.top_surgery_age, u.bottom_surgery_age, u.puberty_blockers_age
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
    { name: "transition_age", categories: ["before_18", "after_18", "unknown"] },
    { name: "puberty_blockers", categories: ["took_blockers", "no_blockers"] },
    { name: "medical", categories: ["took_hormones", "got_top_surgery", "got_bottom_surgery", "social_only", "unknown"] },
    { name: "outcome", categories: ["regrets", "no_regrets", "unknown"] }
  ];

  stages.forEach((stage, stageIndex) => {
    stage.categories.forEach(category => {
      const label = formatCategoryLabel(stage.name, category);
      nodes.push({
        id: `${stage.name}_${category}`,
        label: label,
        stage: stageIndex
      });
    });
  });

  // Process each user through the flow
  const flowCounts = new Map<string, number>();
  
  console.log(`Processing ${users.length} users for Sankey data`);

  users.forEach(user => {
    const userCategories = categorizeUser(user);
    
    // Debug logging for first few users
    if (users.indexOf(user) < 3) {
      console.log(`User ${user.username}: ${userCategories.join(' → ')}`);
    }
    
    // Create links between consecutive stages
    for (let i = 0; i < userCategories.length - 1; i++) {
      const source = userCategories[i];
      const target = userCategories[i + 1];
      const linkKey = `${source}->${target}`;
      
      flowCounts.set(linkKey, (flowCounts.get(linkKey) || 0) + 1);
    }
  });

  // Convert flow counts to links and log age-medical connections
  flowCounts.forEach((value, key) => {
    const [source, target] = key.split('->');
    links.push({ source, target, value });
    
    // Log age-medical connections specifically
    if (source.startsWith('transition_age_') && target.startsWith('medical_')) {
      console.log(`Age-Medical link: ${source} → ${target} (${value} users)`);
    }
  });

  console.log(`Created ${links.length} total links`);
  
  return { nodes, links };
}

function categorizeUser(user: any): string[] {
  const tags = user.tags || [];
  const flow: string[] = [];

  // Filter tags to only include those in availableTags
  const validTags = tags.filter((tag: string) => availableTags.includes(tag));

  // Debug logging for all users to see what tags we're getting
  console.log(`User ${user.username}: validTags=[${validTags.join(', ')}]`);

  // Stage 1: Sex - map database values to node IDs
  let sexCategory = 'unknown';
  if (user.sex === 'm') {
    sexCategory = 'male';
  } else if (user.sex === 'f') {
    sexCategory = 'female';
  }
  flow.push(`sex_${sexCategory}`);

  // Stage 2: Transition Age
  const ageCategory = user.transition_age && user.transition_age < 18 ? 'before_18' : 
                     user.transition_age && user.transition_age >= 18 ? 'after_18' : 'unknown';
  flow.push(`transition_age_${ageCategory}`);

  // Stage 3: Puberty Blockers - check age column or tag
  const hasBlockersAge = user.puberty_blockers_age !== null;
  const hasBlockersTag = validTags.includes('took puberty blockers');
  const tookBlockers = hasBlockersAge || hasBlockersTag;
  
  const blockersCategory = tookBlockers ? 'took_blockers' : 'no_blockers';
  flow.push(`puberty_blockers_${blockersCategory}`);

  // Stage 4: Medical Interventions - check age columns first, then tags
  const hasHormonesAge = user.hormones_age !== null;
  const hasHormonesTag = validTags.includes('took hormones');
  const hasHormones = hasHormonesAge || hasHormonesTag;
  
  const hasTopSurgeryAge = user.top_surgery_age !== null;
  const hasTopSurgeryTag = validTags.includes('got top surgery');
  const hasTopSurgery = hasTopSurgeryAge || hasTopSurgeryTag;
  
  const hasBottomSurgeryAge = user.bottom_surgery_age !== null;
  const hasBottomSurgeryTag = validTags.includes('got bottom surgery');
  const hasBottomSurgery = hasBottomSurgeryAge || hasBottomSurgeryTag;
  
  const socialOnly = validTags.includes('only transitioned socially');
  
  console.log(`User ${user.username} medical checks: hormones=${hasHormones}, topSurgery=${hasTopSurgery}, bottomSurgery=${hasBottomSurgery}, socialOnly=${socialOnly}`);
  
  let medicalCategory = 'unknown'; // Default to unknown
  
  // Priority order: bottom surgery > top surgery > hormones > social only
  if (hasBottomSurgery) {
    medicalCategory = 'got_bottom_surgery';
  } else if (hasTopSurgery) {
    medicalCategory = 'got_top_surgery';
  } else if (hasHormones) {
    medicalCategory = 'took_hormones';
  } else if (socialOnly) {
    medicalCategory = 'social_only';
  }
  
  console.log(`User ${user.username} final medical category: ${medicalCategory}`);
  flow.push(`medical_${medicalCategory}`);

  // Stage 5: Outcome - using exact tag names from availableTags
  const regrets = validTags.includes('regrets transitioning');
  const noRegrets = validTags.includes("doesn't regret transitioning");
  
  let outcome = 'unknown';
  if (regrets) {
    outcome = 'regrets';
  } else if (noRegrets) {
    outcome = 'no_regrets';
  }
  
  flow.push(`outcome_${outcome}`);

  return flow;
}

function formatCategoryLabel(stageName: string, category: string): string {
  // Custom formatting for better readability
  const labelMap: { [key: string]: string } = {
    // Sex labels
    'male': 'Male',
    'female': 'Female',
    'unknown': 'Unknown',
    
    // Sexuality labels
    'homosexual': 'Homosexual',
    'heterosexual': 'Heterosexual',
    'bisexual': 'Bisexual',
    'asexual': 'Asexual',
    
    // Age labels
    'before_18': 'Before 18',
    'after_18': 'After 18',
    
    // Puberty blockers labels
    'took_blockers': 'Took Blockers',
    'no_blockers': 'No Blockers',
    
    // Medical labels
    'took_hormones': 'Took Hormones',
    'got_top_surgery': 'Got Top Surgery',
    'got_bottom_surgery': 'Got Bottom Surgery',
    'social_only': 'Social Only',
    
    // Outcome labels
    'regrets': 'Regrets',
    'no_regrets': 'No Regrets'
  };
  
  return labelMap[category] || category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}
