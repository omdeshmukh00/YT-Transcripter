import 'regenerator-runtime/runtime';
import { PDFDocument, rgb, PDFFont, PDFPage, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

// Define layout dimensions (A4 size: 595.27 x 841.89)
const PAGE_WIDTH = 595.27;
const PAGE_HEIGHT = 841.89;

const MARGIN_LEFT = 50;
const MARGIN_RIGHT = 50;
const MARGIN_TOP = 65;
const MARGIN_BOTTOM = 65;

const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

export interface TranscriptItem {
  timestamp: string;
  text: string;
}

export interface PDFDataInput {
  title: string;
  videoUrl: string;
  transcript: TranscriptItem[];
  fontRegularBytes: Uint8Array | ArrayBuffer;
  fontBoldBytes: Uint8Array | ArrayBuffer;
}

/**
 * Word wraps a string based on the font and font size to fit within a maximum width.
 */
function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  // Replace multiple whitespace/newlines with spaces
  const cleanText = text.replace(/\s+/g, ' ');
  const words = cleanText.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (!word) continue;
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);
    if (testWidth > maxWidth) {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

/**
 * Generates a styled, multi-page PDF document from video transcript data.
 */
export async function generatePdf(input: PDFDataInput): Promise<Uint8Array> {
  const { title, videoUrl, transcript, fontRegularBytes, fontBoldBytes } = input;

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  // Embed custom fonts (Mukta supports Latin & Devanagari)
  const fontRegular = await pdfDoc.embedFont(fontRegularBytes);
  const fontBold = await pdfDoc.embedFont(fontBoldBytes);
  const fontCourier = await pdfDoc.embedStandardFont(StandardFonts.Courier);

  // Keep track of pages to write page footers at the end
  const pages: PDFPage[] = [];
  
  // Helper to add a new page and set standard margins
  const createPage = () => {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pages.push(page);
    return page;
  };

  let currentPage = createPage();
  let y = PAGE_HEIGHT - MARGIN_TOP;

  // 1. Draw Title (centered, bold, size 18, wrapping if needed)
  const titleFontSize = 18;
  const titleLineHeight = titleFontSize * 1.3;
  const wrappedTitle = wrapText(title, fontBold, titleFontSize, CONTENT_WIDTH);
  
  for (const line of wrappedTitle) {
    const lineWidth = fontBold.widthOfTextAtSize(line, titleFontSize);
    const x = (PAGE_WIDTH - lineWidth) / 2; // Center alignment
    
    // Check if title lines overflow (highly unlikely on first page, but safe)
    if (y < MARGIN_BOTTOM + 50) {
      currentPage = createPage();
      y = PAGE_HEIGHT - MARGIN_TOP;
    }

    currentPage.drawText(line, {
      x,
      y,
      size: titleFontSize,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= titleLineHeight;
  }

  y -= 10; // spacing

  // 2. Draw Video URL (centered, blue, size 10, wrapping if needed)
  const urlFontSize = 10;
  const urlLineHeight = urlFontSize * 1.3;
  const displayUrl = `Video Link: ${videoUrl}`;
  const wrappedUrl = wrapText(displayUrl, fontCourier, urlFontSize, CONTENT_WIDTH);

  for (const line of wrappedUrl) {
    const lineWidth = fontCourier.widthOfTextAtSize(line, urlFontSize);
    const x = (PAGE_WIDTH - lineWidth) / 2;

    if (y < MARGIN_BOTTOM + 30) {
      currentPage = createPage();
      y = PAGE_HEIGHT - MARGIN_TOP;
    }

    currentPage.drawText(line, {
      x,
      y,
      size: urlFontSize,
      font: fontCourier,
      color: rgb(0.02, 0.38, 0.75), // Accent blue
    });
    y -= urlLineHeight;
  }

  // Draw URL underline or link action (optional/advanced, drawing link action is nice!)
  // For simplicity, we just make it look like a link

  y -= 15; // spacing

  // 3. Draw Divider line
  if (y < MARGIN_BOTTOM + 20) {
    currentPage = createPage();
    y = PAGE_HEIGHT - MARGIN_TOP;
  }
  
  currentPage.drawLine({
    start: { x: MARGIN_LEFT, y },
    end: { x: PAGE_WIDTH - MARGIN_RIGHT, y },
    thickness: 1,
    color: rgb(0.85, 0.85, 0.85),
  });
  y -= 25; // spacing below divider

  // 4. Draw Transcript lines
  const timestampFontSize = 11;
  const textFontSize = 11;
  const lineHeight = textFontSize * 1.4;
  const itemSpacing = 10; // spacing between separate transcript entries
  
  // Left column width (X = 50 to 90) -> timestamp
  // Right column starts at X = 95 to (PAGE_WIDTH - MARGIN_RIGHT)
  const textX = 95;
  const textMaxWidth = PAGE_WIDTH - MARGIN_RIGHT - textX;

  for (const item of transcript) {
    const wrappedLines = wrapText(item.text, fontRegular, textFontSize, textMaxWidth);
    const blockHeight = Math.max(1, wrappedLines.length) * lineHeight;
    
    // Check if drawing this block will exceed the bottom margin
    if (y - blockHeight < MARGIN_BOTTOM) {
      currentPage = createPage();
      y = PAGE_HEIGHT - MARGIN_TOP;
    }

    // Draw timestamp (bold)
    currentPage.drawText(item.timestamp, {
      x: MARGIN_LEFT,
      y,
      size: timestampFontSize,
      font: fontBold,
      color: rgb(0.4, 0.4, 0.4),
    });

    // Draw transcript text lines
    let lineY = y;
    for (const line of wrappedLines) {
      currentPage.drawText(line, {
        x: textX,
        y: lineY,
        size: textFontSize,
        font: fontRegular,
        color: rgb(0.15, 0.15, 0.15),
      });
      lineY -= lineHeight;
    }

    // Advance Y coordinate by block height + item spacing
    y -= (blockHeight + itemSpacing);
  }

  // 5. Draw Footers (at the very end, once all pages are known)
  const totalPages = pages.length;
  
  for (let i = 0; i < totalPages; i++) {
    const page = pages[i];
    const pageNum = i + 1;
    
    // Draw divider at the bottom of the page
    page.drawLine({
      start: { x: MARGIN_LEFT, y: MARGIN_BOTTOM - 15 },
      end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: MARGIN_BOTTOM - 15 },
      thickness: 0.75,
      color: rgb(0.88, 0.88, 0.88),
    });

    // Brand Label (Left aligned)
    page.drawText('Generated by YT Transcripter', {
      x: MARGIN_LEFT,
      y: MARGIN_BOTTOM - 30,
      size: 9,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    });

    // Page Number (Right aligned)
    const pageString = `Page ${pageNum} of ${totalPages}`;
    const pageStringWidth = fontRegular.widthOfTextAtSize(pageString, 9);
    page.drawText(pageString, {
      x: PAGE_WIDTH - MARGIN_RIGHT - pageStringWidth,
      y: MARGIN_BOTTOM - 30,
      size: 9,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  return await pdfDoc.save();
}
