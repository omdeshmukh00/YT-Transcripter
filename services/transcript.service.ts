import { YoutubeTranscript } from 'youtube-transcript';
import { extractVideoId, getStandardUrl } from '../lib/youtube';
import { getVideoDetails } from '../lib/getVideoDetails';
import { formatDuration } from '../lib/formatTranscript';

export interface TranscriptLine {
  timestamp: string;
  text: string;
}

export interface AvailableLanguage {
  code: string;
  name: string;
}

export interface TranscriptResponse {
  videoId: string;
  title: string;
  url: string;
  thumbnailUrl: string;
  duration: string;
  language: string; // The fetched language (e.g. English, Hindi)
  languageCode: string; // The fetched language code (e.g. en, hi)
  availableLanguages: AvailableLanguage[]; // List of all caption tracks available
  transcript: TranscriptLine[];
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
            // Keep looking
          }
        }
      }
    }
  }
  return null;
}

export class TranscriptService {
  /**
   * Fetches video information and subtitles, returning a formatted transcript structure.
   */
  static async getTranscript(url: string, preferredLang?: string): Promise<TranscriptResponse> {
    const videoId = extractVideoId(url);
    if (!videoId) {
      throw new Error('Invalid YouTube URL. Please check the URL and try again.');
    }

    const standardUrl = getStandardUrl(videoId);
    
    // Fetch video details (preferably oEmbed)
    const details = await getVideoDetails(videoId);
    
    // Fetch watch page HTML to parse captions tracklist
    let availableLanguages: AvailableLanguage[] = [];
    try {
      const watchRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        next: { revalidate: 3600 }
      });
      
      if (watchRes.ok) {
        const html = await watchRes.text();
        const playerResponse = extractJson(html, 'ytInitialPlayerResponse') as Record<string, unknown> | null;
        if (playerResponse && playerResponse.captions) {
          const captions = playerResponse.captions as Record<string, unknown>;
          const tracklist = captions.playerCaptionsTracklistRenderer as Record<string, unknown> | undefined;
          if (tracklist && tracklist.captionTracks) {
            availableLanguages = (tracklist.captionTracks as { languageCode: string; name?: { simpleText?: string; runs?: { text: string }[] | null } | null }[]).map((track) => ({
              code: track.languageCode,
              name: track.name?.simpleText || track.name?.runs?.[0]?.text || track.languageCode
            }));
          }
        }
      }
    } catch (err) {
      console.warn('Failed to retrieve available caption tracks:', err);
    }
    
    // Fetch transcript items
    let transcriptItems: { text: string; duration: number; offset: number; lang?: string }[] = [];
    if (preferredLang) {
      try {
        transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, { lang: preferredLang });
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.warn(`Failed to fetch preferred language ${preferredLang}, falling back:`, error.message);
        transcriptItems = await this.fetchTranscriptWithFallback(videoId);
      }
    } else {
      transcriptItems = await this.fetchTranscriptWithFallback(videoId);
    }

    if (!transcriptItems || transcriptItems.length === 0) {
      throw new Error('No captions/transcripts found for this video. Captions might be disabled or unavailable.');
    }

    // Format timestamps
    const transcript = transcriptItems.map((item) => ({
      timestamp: formatDuration(item.offset),
      text: item.text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\r?\n/g, ' ')
        .trim(),
    }));

    // Estimate total video duration in minutes from the last caption offset
    const lastItem = transcriptItems[transcriptItems.length - 1];
    const totalMs = lastItem.offset + lastItem.duration;
    const minutes = Math.max(1, Math.round(totalMs / 60000));
    const durationStr = `${minutes} min`;

    // Detect language from first caption line or default to English
    const languageCode = transcriptItems[0]?.lang || 'en';
    
    // Convert common codes to readable language names
    const langNames: Record<string, string> = {
      en: 'English',
      hi: 'Hindi',
      mr: 'Marathi',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      ja: 'Japanese',
      zh: 'Chinese',
      ru: 'Russian',
      pt: 'Portuguese',
    };
    
    const baseCode = languageCode.split('-')[0].toLowerCase();
    const language = langNames[baseCode] || baseCode.toUpperCase();

    // Populate available languages with the active one if tracklist is empty
    if (availableLanguages.length === 0) {
      availableLanguages = [{
        code: languageCode,
        name: language
      }];
    }

    return {
      videoId,
      title: details.title,
      url: standardUrl,
      thumbnailUrl: details.thumbnailUrl,
      duration: durationStr,
      language,
      languageCode,
      availableLanguages,
      transcript,
    };
  }

  /**
   * Helper to fetch the transcript, handling potential language configuration fallbacks
   */
  private static async fetchTranscriptWithFallback(videoId: string) {
    try {
      // First try to fetch default transcripts (usually english or auto-generated)
      return await YoutubeTranscript.fetchTranscript(videoId);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      // If it fails, let's try with common fallback languages
      console.warn(`Default transcript fetch failed for ${videoId}:`, error.message);
      
      const fallbacks = [
        { lang: 'hi' },
        { lang: 'mr' },
        { lang: 'en' },
      ];

      for (const opt of fallbacks) {
        try {
          return await YoutubeTranscript.fetchTranscript(videoId, opt);
        } catch {
          // Continue to next fallback
        }
      }

      // If all fails, throw original error
      throw error;
    }
  }
}
