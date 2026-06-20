import { NextRequest, NextResponse } from 'next/server';
import { TranscriptService } from '../../../services/transcript.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, lang } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'YouTube URL is required.' },
        { status: 400 }
      );
    }

    const result = await TranscriptService.getTranscript(url, lang);
    return NextResponse.json(result);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('Error in transcript API route:', error);
    
    let statusCode = 500;
    const errorMessage = error.message || 'An unexpected error occurred while fetching the transcript.';

    if (error.message.includes('Invalid YouTube URL')) {
      statusCode = 400;
    } else if (error.message.includes('No captions/transcripts found')) {
      statusCode = 404;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}
