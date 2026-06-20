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

interface CaptionTrack {
  baseUrl: string;
  languageCode: string;
  name?: {
    simpleText?: string;
    runs?: { text: string }[] | null;
  } | null;
}

interface TranscriptItem {
  text: string;
  duration: number;
  offset: number;
  lang?: string;
}

interface Json3Transcript {
  events?: {
    tStartMs?: number;
    dDurationMs?: number;
    segs?: { utf8?: string }[];
  }[];
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

function decodeTranscriptText(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)));
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
    let captionTracks: CaptionTrack[] = [];
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
            captionTracks = (tracklist.captionTracks as CaptionTrack[]).filter((track) => track.baseUrl && track.languageCode);
            availableLanguages = captionTracks.map((track) => ({
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
    let transcriptItems: TranscriptItem[] = [];
    if (preferredLang) {
      try {
        transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, { lang: preferredLang });
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.warn(`Failed to fetch preferred language ${preferredLang}, falling back:`, error.message);
        transcriptItems = await this.fetchTranscriptWithFallback(videoId, captionTracks, preferredLang);
      }
    } else {
      transcriptItems = await this.fetchTranscriptWithFallback(videoId, captionTracks);
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
  private static async fetchTranscriptWithFallback(
    videoId: string,
    captionTracks: CaptionTrack[] = [],
    preferredLang?: string
  ): Promise<TranscriptItem[]> {
    try {
      // First try to fetch default transcripts (usually english or auto-generated)
      return await YoutubeTranscript.fetchTranscript(videoId);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      // If it fails, let's try with common fallback languages
      console.warn(`Default transcript fetch failed for ${videoId}:`, error.message);
      
      const fallbacks = [
        ...(preferredLang ? [{ lang: preferredLang }] : []),
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

      if (captionTracks.length > 0) {
        try {
          return await this.fetchTranscriptFromCaptionTracks(captionTracks, preferredLang);
        } catch (fallbackErr) {
          console.warn(`Direct caption track fetch failed for ${videoId}:`, fallbackErr);
        }
      }

      // If all fails, throw original error
      throw error;
    }
  }

  private static async fetchTranscriptFromCaptionTracks(
    captionTracks: CaptionTrack[],
    preferredLang?: string
  ): Promise<TranscriptItem[]> {
    const track =
      (preferredLang && captionTracks.find((item) => item.languageCode === preferredLang)) ||
      captionTracks.find((item) => item.languageCode.startsWith('en')) ||
      captionTracks[0];

    if (!track) {
      throw new Error('No usable caption tracks were found.');
    }

    const captionUrl = new URL(track.baseUrl);
    if (!captionUrl.hostname.endsWith('.youtube.com') && captionUrl.hostname !== 'youtube.com') {
      throw new Error('Unexpected caption track host.');
    }

    captionUrl.searchParams.set('fmt', 'json3');
    const response = await fetch(captionUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': preferredLang || track.languageCode,
      },
    });

    if (!response.ok) {
      throw new Error(`Caption track request failed with ${response.status}.`);
    }

    const body = await response.text();
    const transcript = this.parseJson3Transcript(body, track.languageCode) || this.parseXmlTranscript(body, track.languageCode);

    if (transcript.length === 0) {
      throw new Error('Caption track response did not contain transcript lines.');
    }

    return transcript;
  }

  private static parseJson3Transcript(body: string, lang: string): TranscriptItem[] | null {
    try {
      const data = JSON.parse(body) as Json3Transcript;
      if (!Array.isArray(data.events)) return null;

      return data.events
        .map((event) => ({
          text: event.segs?.map((segment) => segment.utf8 || '').join('').trim() || '',
          duration: event.dDurationMs || 0,
          offset: event.tStartMs || 0,
          lang,
        }))
        .filter((item) => item.text.length > 0);
    } catch {
      return null;
    }
  }

  private static parseXmlTranscript(body: string, lang: string): TranscriptItem[] {
    const srv3Results = [...body.matchAll(/<p\s+t="(\d+)"\s+d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g)]
      .map((match) => {
        const inner = match[3];
        const segmentText = [...inner.matchAll(/<s[^>]*>([^<]*)<\/s>/g)]
          .map((segment) => segment[1])
          .join('');
        const text = decodeTranscriptText(segmentText || inner.replace(/<[^>]+>/g, '')).trim();
        return {
          text,
          duration: Number(match[2]),
          offset: Number(match[1]),
          lang,
        };
      })
      .filter((item) => item.text.length > 0);

    if (srv3Results.length > 0) {
      return srv3Results;
    }

    return [...body.matchAll(/<text start="([^"]*)" dur="([^"]*)">([\s\S]*?)<\/text>/g)]
      .map((match) => ({
        text: decodeTranscriptText(match[3]).trim(),
        duration: Math.round(Number(match[2]) * 1000),
        offset: Math.round(Number(match[1]) * 1000),
        lang,
      }))
      .filter((item) => item.text.length > 0);
  }
}
