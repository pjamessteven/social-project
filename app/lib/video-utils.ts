/**
 * Utility functions for video-related operations
 */

/**
 * Generate a URL-friendly slug for a video
 * Format: id-title (lowercase, hyphenated, with special characters removed)
 */
export function generateVideoSlug(id: number, title: string): string {
  // Convert title to lowercase
  let slug = title.toLowerCase();

  // Remove special characters, keep letters, numbers, spaces, and hyphens
  slug = slug.replace(/[^a-z0-9\s-]/g, "");

  // Replace spaces with hyphens
  slug = slug.replace(/\s+/g, "-");

  // Remove consecutive hyphens
  slug = slug.replace(/-+/g, "-");

  // Trim hyphens from start and end
  slug = slug.replace(/^-+|-+$/g, "");

  // Combine with ID
  return `${id}-${slug}`;
}

/**
 * Parse video ID from slug
 * Returns the numeric ID from a slug like "123-video-title"
 */
export function parseVideoIdFromSlug(slug: string): number | null {
  const match = slug.match(/^(\d+)-/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}

/**
 * Extract YouTube video ID from URL
 */
export function getYouTubeVideoId(url: string): string {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return "";
}

/**
 * Generate YouTube embed URL from video ID
 */
export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}

/**
 * Generate YouTube thumbnail URL from video ID
 */
export function getYouTubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

/** Channel part of an author ("Genspect with Helena" → "genspect"). */
function authorKey(author: string | null | undefined): string {
  return (author ?? "")
    .split(/\s+(?:with|avec|mit|con|com)\s+/i)[0]
    .trim()
    .toLowerCase();
}

/**
 * Reorder a newest-first list so the same channel doesn't appear several
 * times in a row: each slot takes the newest remaining video whose channel
 * isn't among the last `window` placed (3 = one row of the grid). A channel
 * with so many videos left that it would otherwise bunch up at the end is
 * placed as soon as it's allowed. Deterministic, so server and client
 * renders agree.
 */
export function spreadByAuthor<T extends { author: string | null }>(
  items: T[],
  window = 3,
): T[] {
  const remaining = [...items];
  const left = new Map<string, number>();
  for (const item of items) {
    const key = authorKey(item.author);
    left.set(key, (left.get(key) ?? 0) + 1);
  }

  const result: T[] = [];
  while (remaining.length > 0) {
    let index = -1;
    for (let gap = window; gap > 0 && index === -1; gap--) {
      const recent = new Set(
        result.slice(-gap).map((v) => authorKey(v.author)),
      );
      const allowed = (v: T) => !recent.has(authorKey(v.author));
      // The channel with the most videos left, if it needs every slot it
      // can get to stay spread out.
      let crowded: string | null = null;
      for (const [key, count] of left) {
        if (
          count > 0 &&
          (count - 1) * gap >= remaining.length - 1 &&
          !recent.has(key)
        ) {
          crowded = key;
          break;
        }
      }
      index = crowded
        ? remaining.findIndex((v) => authorKey(v.author) === crowded)
        : remaining.findIndex(allowed);
    }
    const [next] = remaining.splice(index === -1 ? 0 : index, 1);
    const key = authorKey(next.author);
    left.set(key, (left.get(key) ?? 1) - 1);
    result.push(next);
  }
  return result;
}
