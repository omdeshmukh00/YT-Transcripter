'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { FiSearch, FiFileText, FiShare2, FiEye, FiExternalLink, FiGlobe } from 'react-icons/fi';
import { TranscriptLine, AvailableLanguage } from '../services/transcript.service';

interface TranscriptPreviewProps {
  title: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: string;
  transcript: TranscriptLine[];
  onDownload: () => void;
  onPreview: () => void;
  onShare: () => void;
  isPdfLoading: boolean;
  availableLanguages?: AvailableLanguage[];
  activeLanguageCode?: string;
  onLanguageChange?: (langCode: string) => void;
}

export default function TranscriptPreview({
  title,
  videoUrl,
  thumbnailUrl = '',
  duration = '',
  transcript,
  onDownload,
  onPreview,
  onShare,
  isPdfLoading,
  availableLanguages = [],
  activeLanguageCode = '',
  onLanguageChange,
}: TranscriptPreviewProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter transcript lines based on search query
  const filteredTranscript = useMemo(() => {
    if (!searchQuery.trim()) return transcript;
    
    const query = searchQuery.toLowerCase();
    return transcript.filter((line) => line.text.toLowerCase().includes(query));
  }, [transcript, searchQuery]);

  // Helper to highlight matched query text
  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <mark key={i} className="bg-yellow-500/30 text-yellow-250 dark:text-yellow-200 px-0.5 rounded">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  return (
    <div className="flex flex-col w-full bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm dark:shadow-lg backdrop-blur-md font-sans">
      {/* Header Info */}
      <div className="p-5 border-b border-zinc-100 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/10">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Thumbnail Column */}
          {thumbnailUrl && (
            <div className="relative w-full sm:w-48 aspect-video bg-zinc-100 dark:bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 flex-shrink-0">
              <Image
                src={thumbnailUrl}
                alt={title}
                fill
                sizes="(max-width: 640px) 100vw, 192px"
                className="object-cover"
                unoptimized
              />
              {duration && (
                <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded select-none">
                  {duration}
                </span>
              )}
            </div>
          )}

          {/* Details Column */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              <h2 className="text-zinc-900 dark:text-zinc-100 font-extrabold text-base sm:text-lg leading-snug line-clamp-2">
                {title}
              </h2>
              <a
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 inline-flex items-center gap-1 text-xs sm:text-sm text-red-600 hover:text-red-500 font-bold transition-colors"
              >
                <span>View on YouTube</span>
                <FiExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Caption Language Dropdown */}
            {availableLanguages && availableLanguages.length > 0 && (
              <div className="mt-3.5 flex items-center justify-between gap-3 bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800/60 rounded-2xl px-4 py-2">
                <span className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold flex items-center gap-2">
                  <FiGlobe className="w-4 h-4 text-zinc-400" />
                  <span>Transcript Language:</span>
                </span>
                <select
                  value={activeLanguageCode}
                  onChange={(e) => onLanguageChange && onLanguageChange(e.target.value)}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold px-2.5 py-1.5 text-zinc-700 dark:text-zinc-200 outline-none focus:border-red-500 cursor-pointer max-w-[140px] sm:max-w-xs transition-colors"
                >
                  {availableLanguages.map((lang, index) => (
                    <option key={`${lang.code}-${index}`} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Action Button Grid */}
        <div className="mt-5 grid grid-cols-3 gap-2.5 sm:gap-3">
          <button
            onClick={onPreview}
            disabled={isPdfLoading}
            className="flex items-center justify-center gap-1.5 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold text-zinc-750 dark:text-zinc-200 bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 hover:shadow-xs active:scale-[0.97] transition-all disabled:opacity-50 cursor-pointer outline-none"
            title="Preview PDF"
          >
            <FiEye className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            <span>Preview</span>
          </button>
          
          <button
            onClick={onDownload}
            disabled={isPdfLoading}
            className="flex items-center justify-center gap-1.5 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold text-white bg-red-600 hover:bg-red-500 active:scale-[0.97] transition-all disabled:opacity-50 shadow-[0_4px_14px_rgba(220,38,38,0.2)] cursor-pointer outline-none"
            title="Download PDF"
          >
            {isPdfLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <FiFileText className="w-4 h-4" />
            )}
            <span>Download</span>
          </button>

          <button
            onClick={onShare}
            disabled={isPdfLoading}
            className="flex items-center justify-center gap-1.5 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold text-zinc-750 dark:text-zinc-200 bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 hover:shadow-xs active:scale-[0.97] transition-all disabled:opacity-50 cursor-pointer outline-none"
            title="Share PDF link/file"
          >
            <FiShare2 className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/5 flex items-center relative">
        <FiSearch className="absolute left-9 text-zinc-400 dark:text-zinc-500 w-4 h-4" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter transcript lines..."
          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-xs sm:text-sm text-zinc-700 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-550 outline-none focus:border-red-500 transition-colors shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)]"
        />
      </div>

      {/* Scrollable list of transcript lines */}
      <div className="flex-1 overflow-y-auto max-h-[350px] sm:max-h-[450px] divide-y divide-zinc-100 dark:divide-zinc-800/40 p-4 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
        {filteredTranscript.length > 0 ? (
          filteredTranscript.map((line, index) => (
            <div key={index} className="flex gap-4 py-3 text-xs sm:text-sm">
              <span className="flex-shrink-0 font-bold text-red-600 dark:text-red-500 select-none w-12 font-mono">
                {line.timestamp}
              </span>
              <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed break-words flex-1 font-normal">
                {highlightText(line.text, searchQuery)}
              </p>
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-zinc-400 dark:text-zinc-500 text-sm font-semibold">
            No matching transcript lines found.
          </div>
        )}
      </div>
      
      {/* Line Count Footer */}
      <div className="px-5 py-2.5 bg-zinc-50 dark:bg-zinc-950/40 text-center text-[10px] sm:text-xs text-zinc-550 dark:text-zinc-500 border-t border-zinc-100 dark:border-zinc-800/60">
        Showing {filteredTranscript.length} of {transcript.length} captions
      </div>
    </div>
  );
}
