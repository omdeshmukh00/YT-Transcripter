import { NextRequest, NextResponse } from 'next/server';
import { PdfService } from '../../../services/pdf.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, url, transcript } = body;

    if (!title || !url || !transcript || !Array.isArray(transcript)) {
      return NextResponse.json(
        { error: 'Required fields missing: title, url, or transcript list.' },
        { status: 400 }
      );
    }

    const pdfBuffer = await PdfService.compilePdf({
      title,
      videoUrl: url,
      transcript,
    });

    // Sanitize title to use as a safe filename, only removing characters that are invalid in major OS filesystems
    const safeTitle = title
      .replace(/[\\/:*?"<>|]/g, '_')
      .trim()
      .substring(0, 60) || 'transcript';
    
    const filename = `${safeTitle}_transcript.pdf`;

    // Return the PDF buffer directly as a stream with appropriate headers
    return new Response(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.byteLength.toString(),
      },
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('Error in PDF generation API route:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred during PDF compilation.' },
      { status: 500 }
    );
  }
}
