import {
  MAX_VIDEO_AUTHOR_LENGTH,
  MAX_VIDEO_TITLE_LENGTH,
  MAX_VIDEO_URL_LENGTH,
} from "@/app/lib/constants";
import { checkIpBan, getIpFromRequest } from "@/app/lib/ipBan";
import {
  getMessagesUntilCaptchaRequired,
  incrementMessageCount,
  isCaptchaRequired,
} from "@/app/lib/messageCounter";
import { checkRateLimit } from "@/app/lib/rateLimit";
import { sanitizeString, sanitizeUrl } from "@/app/lib/sanitization";
import { db } from "@/db";
import { videos } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const submitVideoSchema = z.object({
  url: z.string().url().max(MAX_VIDEO_URL_LENGTH),
  title: z.string().max(MAX_VIDEO_TITLE_LENGTH).optional(),
  author: z.string().max(MAX_VIDEO_AUTHOR_LENGTH).optional(),
});

// Function to extract video ID from YouTube URL
function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Function to scrape YouTube metadata
async function getYouTubeMetadata(videoId: string) {
  try {
    // Use YouTube's oEmbed API for basic metadata
    const oembedResponse = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
    );

    if (!oembedResponse.ok) {
      throw new Error("Failed to fetch video metadata");
    }

    const oembedData = await oembedResponse.json();

    // For more detailed metadata, we'd need to scrape the page or use YouTube API
    // For now, we'll use what we can get from oEmbed
    return {
      title: oembedData.title,
      author: oembedData.author_name,
      description: "", // oEmbed doesn't provide description
      duration: null, // oEmbed doesn't provide duration
      date: null, // oEmbed doesn't provide upload date
    };
  } catch (error) {
    console.error("Error fetching YouTube metadata:", error);
    throw new Error("Failed to fetch video metadata");
  }
}

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting (10/min, 100/hour)
    const rateLimitResponse = await checkRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    // Check if IP is banned before processing request
    await checkIpBan(request);

    // Check CAPTCHA requirement
    const ipAddress = getIpFromRequest(request);
    const captchaRequired = await isCaptchaRequired(ipAddress);
    if (captchaRequired) {
      const messagesUntilCaptcha =
        await getMessagesUntilCaptchaRequired(ipAddress);
      const messageText =
        messagesUntilCaptcha === 0
          ? "Please complete the CAPTCHA to continue."
          : `Please complete the CAPTCHA to continue. You have ${messagesUntilCaptcha} message${messagesUntilCaptcha === 1 ? "" : "s"} remaining before CAPTCHA is required again.`;
      return NextResponse.json(
        {
          requiresCaptcha: true,
          message: messageText,
          error: "CAPTCHA verification required",
          messagesUntilCaptcha,
        },
        { status: 402 },
      );
    }

    const body = await request.json();
    const {
      url: rawUrl,
      title: rawProvidedTitle,
      author: rawProvidedAuthor,
    } = submitVideoSchema.parse(body);

    // Sanitize URL and optional fields
    const url = sanitizeUrl(rawUrl, MAX_VIDEO_URL_LENGTH);
    const providedTitle = sanitizeString(
      rawProvidedTitle,
      MAX_VIDEO_TITLE_LENGTH,
    );
    const providedAuthor = sanitizeString(
      rawProvidedAuthor,
      MAX_VIDEO_AUTHOR_LENGTH,
    );

    if (!url) {
      return NextResponse.json(
        { error: "Invalid YouTube URL" },
        { status: 400 },
      );
    }

    // Extract video ID from URL
    const videoId = extractYouTubeVideoId(url);
    if (!videoId) {
      return NextResponse.json(
        { error: "Invalid YouTube URL" },
        { status: 400 },
      );
    }

    // Check if video already exists
    const existingVideo = await db
      .select()
      .from(videos)
      .where(eq(videos.url, url))
      .limit(1);

    if (existingVideo.length > 0) {
      return NextResponse.json(
        { error: "Video already exists in database" },
        { status: 409 },
      );
    }

    // Use provided metadata if available, otherwise fetch from YouTube
    let metadata;
    if (providedTitle && providedAuthor) {
      metadata = {
        title: providedTitle,
        author: providedAuthor,
        description: "",
        duration: null,
        date: null,
      };
    } else {
      metadata = await getYouTubeMetadata(videoId);
    }

    // Insert video into database
    const [newVideo] = await db
      .insert(videos)
      .values({
        title: metadata.title || "Untitled",
        author: metadata.author || "Unknown",
        url,
        type: "youtube",
        description: metadata.description || "",
        duration: metadata.duration,
        date: metadata.date,
      })
      .returning();

    // Increment message count for CAPTCHA tracking
    await incrementMessageCount(ipAddress);

    return NextResponse.json(
      {
        message: "Video submitted successfully",
        video: newVideo,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error submitting video:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
