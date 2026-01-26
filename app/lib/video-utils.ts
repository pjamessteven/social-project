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
  slug = slug.replace(/[^a-z0-9\s-]/g, '');

  // Replace spaces with hyphens
  slug = slug.replace(/\s+/g, '-');

  // Remove consecutive hyphens
  slug = slug.replace(/-+/g, '-');

  // Trim hyphens from start and end
  slug = slug.replace(/^-+|-+$/g, '');

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
