'use client';

import React from 'react';
import Image from 'next/image';
import { FiTrash2, FiEye, FiDownload, FiShare2, FiClock } from 'react-icons/fi';

export interface HistoryItem {
  id: string; // YouTube Video ID
  title: string;
  url: string;
  thumbnail: string;
  language: string;
  languageCode?: string;
  availableLanguages?: { code: string; name: string }[];
  duration: string;
  generatedAt: string;
  transcript: { timestamp: string; text: string }[];
}

interface HistorySectionProps {
  items: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onPreview: (item: HistoryItem) => void;
  onDownload: (item: HistoryItem) => void;
  onShare: (item: HistoryItem) => void;
  isActionLoading: string | null; // Represents videoId that is currently generating PDF
  isLoading?: boolean; // Shimmering loading state
}

function getRelativeTimeString(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    if (isNaN(date.getTime())) return 'Recently';

    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  } catch {
    return 'recently';
  }
}

export default function HistorySection({
  items,
  onSelect,
  onDelete,
  onClearAll,
  onPreview,
  onDownload,
  onShare,
  isActionLoading,
  isLoading = false,
}: HistorySectionProps) {
  // 1. Shimmering Skeleton loader during initial load
  if (isLoading) {
    return (
      <div className="w-full font-sans">
        <div className="flex items-center justify-between mb-4 animate-pulse">
          <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-36" />
          <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded-md w-16" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="flex flex-col bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden animate-pulse p-4 gap-3.5"
            >
              <div className="flex gap-4 flex-1">
                {/* Thumbnail block skeleton */}
                <div className="w-24 h-16 sm:w-28 sm:h-18 flex-shrink-0 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
                
                {/* Details layout skeleton */}
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div className="space-y-2">
                    <div className="h-3.5 bg-zinc-200 dark:bg-zinc-800 rounded-md w-full" />
                    <div className="h-3.5 bg-zinc-200 dark:bg-zinc-800 rounded-md w-4/5" />
                  </div>
                  <div className="h-2.5 bg-zinc-200 dark:bg-zinc-800 rounded-md w-3/5" />
                </div>
              </div>

              {/* Action row skeleton */}
              <div className="flex items-center justify-between gap-2.5">
                <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded-xl flex-1" />
                <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded-xl flex-1" />
                <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded-xl flex-1" />
                <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded-xl w-8" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 2. Empty state rendering
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white/40 dark:bg-zinc-900/10 text-center backdrop-blur-md">
        <FiClock className="w-10 h-10 text-zinc-400 dark:text-zinc-600 mb-3 animate-pulse" />
        <h3 className="text-zinc-700 dark:text-zinc-400 font-bold text-sm sm:text-base">No history yet</h3>
        <p className="text-zinc-500 dark:text-zinc-500 text-xs sm:text-sm mt-1.5 max-w-xs leading-relaxed">
          Your parsed transcripts will appear here so you can preview, share, and download them offline.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full font-sans">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-zinc-800 dark:text-zinc-100 font-bold text-base sm:text-lg flex items-center gap-2">
          <span>Recent Transcripts</span>
          <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-xs px-2 py-0.5 rounded-full font-mono">
            {items.length}
          </span>
        </h3>
        <button
          onClick={onClearAll}
          className="text-zinc-500 hover:text-red-500 dark:hover:text-red-400 text-xs sm:text-sm font-semibold transition-colors outline-none cursor-pointer flex items-center gap-1"
        >
          <span>Clear All</span>
          <FiTrash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item) => {
          const isLoading = isActionLoading === item.id;
          return (
            <div
              key={item.id}
              className="group flex flex-col bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden hover:border-zinc-350 dark:hover:border-zinc-700/60 hover:shadow-md transition-all duration-300 backdrop-blur-md relative p-4 gap-3.5"
            >
              {/* Card Body - Clickable to restore active view */}
              <div 
                onClick={() => onSelect(item)}
                className="flex gap-4 cursor-pointer hover:bg-zinc-50/20 dark:hover:bg-zinc-800/10 rounded-2xl transition-colors flex-1"
              >
                {/* Thumbnail Column */}
                <div className="relative w-24 h-16 sm:w-28 sm:h-18 flex-shrink-0 bg-zinc-100 dark:bg-zinc-950 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
                  <Image
                    src={item.thumbnail}
                    alt={item.title}
                    fill
                    sizes="(max-width: 640px) 96px, 112px"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    unoptimized // Youtube thumbnail urls are external
                  />
                  {/* Language overlay badge */}
                  <span className="absolute bottom-1 right-1 bg-red-600/90 dark:bg-red-600/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-xs select-none">
                    {item.language}
                  </span>
                </div>

                {/* Details Column */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <h4 className="text-zinc-800 dark:text-zinc-100 font-semibold text-xs sm:text-sm line-clamp-2 group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors leading-snug">
                    {item.title}
                  </h4>
                  
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-500">
                    <span className="flex items-center gap-1 font-medium text-zinc-500 dark:text-zinc-400">
                      <FiClock className="w-3.5 h-3.5 flex-shrink-0" />
                      {item.duration}
                    </span>
                    <span>•</span>
                    <span>Generated {getRelativeTimeString(item.generatedAt)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center justify-between gap-2 border-t border-zinc-100 dark:border-zinc-800/60 pt-3.5">
                <button
                  onClick={() => onPreview(item)}
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl text-[10px] sm:text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-zinc-100 bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 hover:shadow-xs active:scale-[0.95] transition-all disabled:opacity-40 outline-none cursor-pointer"
                  title="Preview PDF"
                >
                  <FiEye className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                  <span>Preview</span>
                </button>
                
                <button
                  onClick={() => onDownload(item)}
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl text-[10px] sm:text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-zinc-100 bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 hover:shadow-xs active:scale-[0.95] transition-all disabled:opacity-40 outline-none cursor-pointer"
                  title="Download PDF"
                >
                  {isLoading ? (
                    <div className="w-3.5 h-3.5 border border-zinc-400 dark:border-zinc-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <FiDownload className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                  )}
                  <span>Download</span>
                </button>

                <button
                  onClick={() => onShare(item)}
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl text-[10px] sm:text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-zinc-100 bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 hover:shadow-xs active:scale-[0.95] transition-all disabled:opacity-40 outline-none cursor-pointer"
                  title="Share Transcript"
                >
                  <FiShare2 className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                  <span>Share</span>
                </button>

                <button
                  onClick={() => onDelete(item.id)}
                  disabled={isLoading}
                  className="flex-shrink-0 flex items-center justify-center p-2 rounded-xl text-zinc-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 active:scale-[0.95] transition-all disabled:opacity-40 outline-none cursor-pointer"
                  title="Delete from history"
                >
                  <FiTrash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
