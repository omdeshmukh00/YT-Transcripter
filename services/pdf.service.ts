import fs from 'fs';
import path from 'path';
import { generatePdf, TranscriptItem } from '../lib/pdf';

export interface GeneratePdfRequest {
  title: string;
  videoUrl: string;
  thumbnailUrl?: string;
  transcript: TranscriptItem[];
}

export class PdfService {
  /**
   * Compiles the video title, url, and transcript into a Unicode PDF document.
   */
  static async compilePdf(data: GeneratePdfRequest): Promise<Uint8Array> {
    // Resolve font file paths relative to the current working directory (compatible with Vercel serverless)
    const fontRegularPath = path.join(process.cwd(), 'public', 'fonts', 'Mukta-Regular.ttf');
    const fontBoldPath = path.join(process.cwd(), 'public', 'fonts', 'Mukta-Bold.ttf');

    if (!fs.existsSync(fontRegularPath) || !fs.existsSync(fontBoldPath)) {
      throw new Error('Required Mukta fonts are missing in the public/fonts directory. Please verify installation.');
    }

    try {
      const fontRegularBytes = fs.readFileSync(fontRegularPath);
      const fontBoldBytes = fs.readFileSync(fontBoldPath);

      return await generatePdf({
        title: data.title,
        videoUrl: data.videoUrl,
        thumbnailUrl: data.thumbnailUrl,
        transcript: data.transcript,
        fontRegularBytes,
        fontBoldBytes,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('Failed to compile PDF in PdfService:', error);
      throw new Error(`PDF generation failed: ${error.message}`);
    }
  }
}
