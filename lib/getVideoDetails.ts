export interface VideoDetails {
  title: string;
  author: string;
  thumbnailUrl: string;
  videoUrl: string;
}

/**
 * Extracts JSON assigned to a variable in HTML by matching balanced braces.
 */
function extractJson(html: string, variableName: string): unknown {
  const marker = `${variableName} = `;
  const startIndex = html.indexOf(marker);
  if (startIndex === -1) return null;
  const jsonStart = html.substring(startIndex + marker.length);
  
  let braceCount = 0;
  let inString = false;
  let escape = false;
  for (let i = 0; i < jsonStart.length; i++) {
    const char = jsonStart[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === '\\') {
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          const jsonStr = jsonStart.substring(0, i + 1);
          try {
            return JSON.parse(jsonStr);
          } catch {
            // If parsing fails, continue looking
          }
        }
      }
    }
  }
  return null;
}

/**
 * Fetches YouTube video details such as Title, Author, and Thumbnail.
 * Prefers the oEmbed API and falls back to watch page HTML parsing.
 */
export async function getVideoDetails(videoId: string): Promise<VideoDetails> {
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  
  // 1. Try oEmbed API first
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;
    const res = await fetch(oembedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      next: { revalidate: 3600 } // Cache for 1 hour
    });
    
    if (res.ok) {
      const data = await res.json() as Record<string, string>;
      if (data && data.title) {
        return {
          title: data.title,
          author: data.author_name || 'YouTube Creator',
          thumbnailUrl: data.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          videoUrl,
        };
      }
    }
  } catch (err) {
    console.warn(`oEmbed fetch failed for video ID ${videoId}, falling back to scraping:`, err);
  }

  // 2. Fallback to watch page HTML scraping
  try {
    const res = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      next: { revalidate: 3600 }
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch YouTube page: ${res.statusText}`);
    }

    const html = await res.text();
    const playerResponse = extractJson(html, 'ytInitialPlayerResponse') as Record<string, unknown> | null;

    if (playerResponse && playerResponse.videoDetails) {
      const details = playerResponse.videoDetails as Record<string, string>;
      return {
        title: details.title || 'Unknown Title',
        author: details.author || 'YouTube Creator',
        thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        videoUrl,
      };
    }

    // Secondary fallback using direct regex
    const ogTitleMatch = html.match(/<meta property="og:title" content="(.*?)">/);
    const titleMatch = html.match(/<title>(.*?)<\/title>/);
    let title = 'Unknown Video';
    if (ogTitleMatch && ogTitleMatch[1]) {
      title = ogTitleMatch[1];
    } else if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].replace(' - YouTube', '');
    }

    return {
      title,
      author: 'YouTube Creator',
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      videoUrl,
    };
  } catch (err) {
    console.error(`Fallback scraping also failed for ${videoId}:`, err);
    return {
      title: 'YouTube Video',
      author: 'YouTube Creator',
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      videoUrl,
    };
  }
}
