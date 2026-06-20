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

interface InnertubePlayerResponse {
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks?: CaptionTrack[];
    };
  };
  videoDetails?: {
    title?: string;
    author?: string;
    lengthSeconds?: string;
  };
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
      const customItems = transcriptItems as TranscriptItem[] & { availableLanguages?: AvailableLanguage[] };
      if (customItems.availableLanguages && customItems.availableLanguages.length > 0) {
        availableLanguages = customItems.availableLanguages;
      } else {
        availableLanguages = [{
          code: languageCode,
          name: language
        }];
      }
    }

    let videoTitle = details.title;
    const customItems = transcriptItems as TranscriptItem[] & { title?: string; availableLanguages?: AvailableLanguage[] };
    if ((!videoTitle || videoTitle === 'YouTube Video' || videoTitle === 'YouTube' || videoTitle === 'Unknown Title') && customItems.title) {
      videoTitle = customItems.title;
    }

    return {
      videoId,
      title: videoTitle,
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
      return await this.fetchTranscriptViaAndroidInnertube(videoId, preferredLang);
    } catch (err) {
      console.warn(`Android InnerTube transcript fetch failed for ${videoId}:`, err);
    }

    try {
      return await this.fetchTranscriptViaYoutubeTranscriptAi(videoId, preferredLang);
    } catch (err) {
      console.warn(`youtube-transcript.ai fetch failed for ${videoId}:`, err);
    }

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

  private static async fetchTranscriptViaAndroidInnertube(
    videoId: string,
    preferredLang?: string
  ): Promise<TranscriptItem[]> {
    const clientVersion = '20.10.38';
    const userAgent = `com.google.android.youtube/${clientVersion} (Linux; U; Android 14)`;

    const response = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': userAgent,
        'Accept-Language': preferredLang || 'en-US,en;q=0.9',
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'ANDROID',
            clientVersion,
            androidSdkVersion: 35,
            hl: preferredLang || 'en',
            gl: 'IN',
            userAgent,
          },
        },
        videoId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Android InnerTube request failed with ${response.status}.`);
    }

    const data = (await response.json()) as InnertubePlayerResponse;
    const captionTracks = data.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];

    if (captionTracks.length === 0) {
      throw new Error('Android InnerTube returned no caption tracks.');
    }

    const items = await this.fetchTranscriptFromCaptionTracks(captionTracks, preferredLang);
    const customItems = items as TranscriptItem[] & { title?: string };
    if (data.videoDetails?.title) {
      customItems.title = data.videoDetails.title;
    }
    return items;
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

  private static async fetchTranscriptViaYoutubeTranscriptAi(
    videoId: string,
    preferredLang?: string
  ): Promise<TranscriptItem[]> {
    const url = new URL(`https://youtube-transcript.ai/transcript/${videoId}.txt`);
    if (preferredLang) {
      url.searchParams.set('lang', preferredLang);
    }

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`youtube-transcript.ai responded with HTTP ${response.status}`);
    }

    const body = await response.text();
    const items = this.parseYoutubeTranscriptAi(body);
    if (items.length === 0) {
      throw new Error('youtube-transcript.ai response contained no transcript segments.');
    }

    // Parse video title from the first header line (e.g. "# Transcript: Rick Astley...")
    const titleMatch = body.match(/^# Transcript:\s*(.*)$/m);
    const parsedTitle = titleMatch ? titleMatch[1].trim() : '';

    const customItems = items as TranscriptItem[] & { title?: string; availableLanguages?: AvailableLanguage[] };
    if (parsedTitle) {
      customItems.title = parsedTitle;
    }

    // Parse other available languages and attach to the returned array
    const availableLangs = this.parseAvailableLanguagesFromYoutubeTranscriptAi(body);
    if (availableLangs.length > 0) {
      // Also add the active language to the available languages list if it's not already there
      const activeLangCode = items[0]?.lang || preferredLang || 'en';
      const hasActive = availableLangs.some(l => l.code === activeLangCode);
      if (!hasActive) {
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
          pa: 'Punjabi',
        };
        const baseCode = activeLangCode.split('-')[0].toLowerCase();
        const activeName = langNames[baseCode] || baseCode.toUpperCase();
        availableLangs.unshift({ code: activeLangCode, name: activeName });
      }
      customItems.availableLanguages = availableLangs;
    }

    return items;
  }

  private static parseYoutubeTranscriptAi(text: string): TranscriptItem[] {
    const lines = text.split('\n');
    const items: TranscriptItem[] = [];
    
    let lang = 'en';
    const langMatch = text.match(/Language:\s*([a-zA-Z\-]+)/);
    if (langMatch) {
      lang = langMatch[1];
    }

    for (const line of lines) {
      const match = line.match(/^\[(\d+):(\d+)(?::(\d+))?\]\s*(.*)$/);
      if (match) {
        const h_or_m = parseInt(match[1], 10);
        const m_or_s = parseInt(match[2], 10);
        const s = match[3] ? parseInt(match[3], 10) : undefined;
        
        let offsetMs = 0;
        if (s !== undefined) {
          const h = h_or_m;
          const m = m_or_s;
          offsetMs = ((h * 3600) + (m * 60) + s) * 1000;
        } else {
          const m = h_or_m;
          const sec = m_or_s;
          offsetMs = ((m * 60) + sec) * 1000;
        }

        items.push({
          offset: offsetMs,
          duration: 0,
          text: match[4].trim(),
          lang,
        });
      }
    }

    for (let i = 0; i < items.length; i++) {
      const current = items[i];
      const next = items[i + 1];
      if (next) {
        current.duration = next.offset - current.offset;
      } else {
        current.duration = 5000; // default 5s
      }
    }

    return items;
  }

  private static parseAvailableLanguagesFromYoutubeTranscriptAi(text: string): AvailableLanguage[] {
    const match = text.match(/Other available languages:\s*(.*)/);
    if (!match) return [];
    
    const langsStr = match[1];
    const cleanLangsStr = langsStr.split('\n')[0].trim();
    const parts = cleanLangsStr.split(',').map(p => p.trim());
    
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
      pa: 'Punjabi',
      it: 'Italian',
      ko: 'Korean',
      vi: 'Vietnamese',
      ar: 'Arabic',
      tr: 'Turkish',
      nl: 'Dutch',
      pl: 'Polish',
      sv: 'Swedish',
      id: 'Indonesian',
    };

    const available: AvailableLanguage[] = [];
    
    for (const part of parts) {
      const itemMatch = part.match(/^([a-zA-Z0-9\-]+)(?:\s*\(([^)]+)\))?(?:\s*\[([^\]]+)\])?$/);
      if (itemMatch) {
        const code = itemMatch[1];
        const standardCode = itemMatch[2] || code;
        const isAuto = itemMatch[3] === 'auto';
        
        const baseCode = standardCode.split('-')[0].toLowerCase();
        let name = langNames[baseCode] || baseCode.toUpperCase();
        if (isAuto) {
          name += ' (Auto)';
        }
        
        available.push({ code, name });
      }
    }
    
    return available;
  }
}
