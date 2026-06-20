/**
 * Extracts the 11-character YouTube video ID from various YouTube URL formats.
 * Supports:
 * - https://www.youtube.com/watch?v=dQw4w9WgXcQ
 * - https://youtu.be/dQw4w9WgXcQ
 * - https://m.youtube.com/watch?v=dQw4w9WgXcQ
 * - https://www.youtube.com/embed/dQw4w9WgXcQ
 * - https://www.youtube.com/shorts/dQw4w9WgXcQ
 * - youtube.com/watch?v=dQw4w9WgXcQ
 * - dQw4w9WgXcQ (direct ID input)
 */
export function extractVideoId(url: string): string | null {
  const trimmed = url.trim();
  
  // If it's already a direct 11-character alphanumeric string, return it
  if (/^[0-9A-Za-z_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Regex to capture YouTube video IDs from various formats
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
  const match = trimmed.match(regExp);
  
  if (match && match[2] && match[2].length === 11) {
    return match[2];
  }
  
  return null;
}

/**
 * Normalizes a YouTube URL to the standard watch link.
 */
export function getStandardUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}
