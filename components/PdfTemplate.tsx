'use client';

import React from 'react';

export interface TranscriptItem {
  timestamp: string;
  text: string;
}

interface PdfTemplateProps {
  title: string;
  videoUrl: string;
  thumbnailUrl?: string;
  transcript: TranscriptItem[];
  scale?: number;
}

/**
 * Mathematically segments the transcript lines into pages to fit inside standard A4 height.
 * The first page leaves extra space (approx 140px / 250px) for the video title, thumbnail, URL, and main divider.
 */
export function chunkTranscript(transcript: TranscriptItem[], hasThumbnail?: boolean): TranscriptItem[][] {
  const pages: TranscriptItem[][] = [];
  let currentPage: TranscriptItem[] = [];

  const maxPageHeight = 690; // A4 height (842) - margins (approx 120-130) = ~710-722. 690 is a safe limit.
  const titleBlockHeight = hasThumbnail ? 260 : 150; // Estimated height for Title, Thumbnail, URL and divider on Page 1

  let currentPageHeight = 0;
  let isFirstPage = true;

  for (const item of transcript) {
    // Estimate height of each transcript item based on text length:
    // Base spacing + padding = 24px
    // Char width is approx 7.4px at 14px font. A4 content width is 495px (595 - 100).
    // Timestamp column is 60px, text column is 435px.
    // Average character width is ~7.4px, so ~60 characters fit per line.
    const charsPerLine = 60;
    const linesCount = Math.ceil(item.text.length / charsPerLine) || 1;
    const itemHeight = 24 + linesCount * 22; // 24px base + 22px per line (line-height at 14px is approx 22px)

    const limit = isFirstPage ? maxPageHeight - titleBlockHeight : maxPageHeight;

    if (currentPageHeight + itemHeight > limit && currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [item];
      currentPageHeight = itemHeight;
      isFirstPage = false;
    } else {
      currentPage.push(item);
      currentPageHeight += itemHeight;
    }
  }

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return pages;
}

export default function PdfTemplate({ title, videoUrl, thumbnailUrl, transcript, scale = 1 }: PdfTemplateProps) {
  const pages = chunkTranscript(transcript, !!thumbnailUrl);
  const totalPages = pages.length;

  return (
    <div className="flex flex-col bg-zinc-950 p-4 gap-8 select-none items-center">
      {pages.map((pageItems, pageIndex) => {
        const pageNum = pageIndex + 1;
        const isPageOne = pageNum === 1;

        const renderPageContent = (
          <div
            className="pdf-page-element w-[595.27px] h-[841.89px] bg-white text-zinc-900 px-[50px] py-[60px] flex flex-col justify-between shadow-2xl relative"
            style={{
              fontFamily: "var(--font-mukta), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            }}
          >
            {/* Top Content Area */}
            <div className="flex-1 flex flex-col">
              {/* Page 1 Header */}
              {isPageOne ? (
                <div className="text-center mb-6">
                  <h1 className="text-[18px] font-bold tracking-tight text-zinc-900 leading-snug px-4">
                    {title}
                  </h1>
                  {thumbnailUrl && (
                    <div className="mt-3 flex justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/proxy-image?url=${encodeURIComponent(thumbnailUrl)}`}
                        alt="Video Thumbnail"
                        className="w-[160px] h-[90px] object-cover rounded-lg border border-zinc-200 shadow-sm"
                      />
                    </div>
                  )}
                  <a
                    href={videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-[10px] text-blue-600 underline font-mono break-all"
                    style={{
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                    }}
                  >
                    Video Link: {videoUrl}
                  </a>
                  <div className="mt-4 border-b border-zinc-200 w-full" />
                </div>
              ) : (
                /* Page 2+ Running Header */
                <div className="flex justify-between items-center text-[10px] text-zinc-400 border-b border-zinc-200 pb-2 mb-4">
                  <span className="truncate max-w-[350px] font-medium">{title}</span>
                  <span className="font-semibold text-zinc-500">Video Transcript</span>
                </div>
              )}

              {/* Transcript Entries list */}
              <div className="flex flex-col gap-2.5 flex-1">
                {pageItems.map((item, index) => (
                  <div key={index} className="flex gap-4 text-[14px]">
                    <span className="w-[60px] flex-shrink-0 font-bold text-zinc-500 font-mono">
                      {item.timestamp}
                    </span>
                    <p className="flex-1 text-zinc-800 leading-relaxed font-normal whitespace-pre-wrap break-words">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Footer Area */}
            <div className="mt-4">
              <div className="border-t border-zinc-200 w-full, mb-3" />
              <div className="flex justify-between items-center text-[9px] text-zinc-400">
                <span className="font-medium">Generated by YT Transcripter</span>
                <span className="font-semibold">
                  Page {pageNum} of {totalPages}
                </span>
              </div>
            </div>
          </div>
        );

        if (scale !== 1) {
          return (
            <div
              key={pageIndex}
              className="flex items-start justify-center overflow-hidden"
              style={{
                width: '100%',
                height: `${841.89 * scale}px`,
              }}
            >
              <div
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: 'top center',
                  width: '595.27px',
                  height: '841.89px',
                  flexShrink: 0,
                }}
              >
                {renderPageContent}
              </div>
            </div>
          );
        }

        return (
          <React.Fragment key={pageIndex}>
            {renderPageContent}
          </React.Fragment>
        );
      })}
    </div>
  );
}
