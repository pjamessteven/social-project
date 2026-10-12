import { getIP } from "@/app/lib/getIp";
import { isBot } from "@/app/lib/isBot";
import { recordPageView } from "@/app/lib/pages";
import { connectRedis } from "@/app/lib/redis";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/**
 * Public view beacon for wiki pages (sent by WikiViewTracker after render).
 * Bots are ignored and repeat views are deduped per IP + page for a day.
 */

const bodySchema = z.object({ id: z.number().int().positive() });

const DEDUPE_TTL_SECONDS = 60 * 60 * 24;

export async function POST(request: NextRequest) {
  if (isBot(request.headers.get("user-agent"))) {
    return new NextResponse(null, { status: 204 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { id } = parsed.data;

  const ip = getIP(request);
  const redis = await connectRedis();
  if (redis && ip !== "unknown") {
    try {
      const fresh = await redis.set(`page_view:${id}:${ip}`, "1", {
        NX: true,
        EX: DEDUPE_TTL_SECONDS,
      });
      if (!fresh) return new NextResponse(null, { status: 204 });
    } catch (error) {
      console.error("Page view dedupe failed:", error);
    }
  }

  try {
    await recordPageView(id);
  } catch (error) {
    console.error("Failed to record page view:", error);
  }
  return new NextResponse(null, { status: 204 });
}
