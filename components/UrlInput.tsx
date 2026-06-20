'use client';

import React, { useState } from 'react';
import { FiYoutube, FiClipboard, FiX, FiArrowRight } from 'react-icons/fi';
import { extractVideoId } from '../lib/youtube';

interface UrlInputProps {
  onSearch: (url: string) => void;
  isLoading: boolean;
  initialValue?: string;
}

export default function UrlInput({ onSearch, isLoading, initialValue = '' }: UrlInputProps) {
  const [url, setUrl] = useState(initialValue);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync state if initialValue changes (e.g. on Web Share Target launch)
  React.useEffect(() => {
    if (initialValue) {
      const timer = setTimeout(() => {
        setUrl(initialValue);
        setValidationError(null);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [initialValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const videoId = extractVideoId(url);
    if (!url.trim()) {
      setValidationError('Please enter a YouTube video link.');
      return;
    }
    if (!videoId) {
      setValidationError('Invalid YouTube URL. Please make sure it is a valid video link.');
      return;
    }
    onSearch(url);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text);
        const videoId = extractVideoId(text);
        if (!videoId) {
          setValidationError('Pasted text does not look like a valid YouTube video link.');
        } else {
          setValidationError(null);
        }
      }
    } catch (err) {
      console.warn('Failed to read clipboard text:', err);
    }
  };

  const handleClear = () => {
    setUrl('');
    setValidationError(null);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col gap-3">
        {/* Input & Paste Button Row */}
        <div className="flex gap-2.5 items-stretch">
          <div className="relative flex-1 flex items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl focus-within:border-red-500 focus-within:ring-4 focus-within:ring-red-100/50 dark:focus-within:ring-red-950/20 transition-all duration-300 px-4 py-3 sm:py-3.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="flex-shrink-0 text-red-600 dark:text-red-500 mr-2.5">
              <FiYoutube className="w-5.5 h-5.5 sm:w-6 sm:h-6" />
            </div>
            
            <input
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (e.target.value) {
                  setValidationError(null);
                }
              }}
              disabled={isLoading}
              placeholder="https://youtu.be/6BoSs8tGjG"
              className="w-full bg-transparent border-0 outline-none text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 text-sm sm:text-base pr-8 font-medium"
            />

            {url && (
              <button
                type="button"
                onClick={handleClear}
                disabled={isLoading}
                className="absolute right-3 text-zinc-400 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 p-1 rounded-full transition-colors cursor-pointer outline-none"
                title="Clear input"
              >
                <FiX className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handlePaste}
            disabled={isLoading}
            className="flex-shrink-0 flex items-center justify-center w-12 sm:w-13 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 active:scale-[0.96] hover:bg-zinc-50 dark:hover:bg-zinc-800/60 shadow-sm transition-all cursor-pointer outline-none"
            title="Paste from clipboard"
          >
            <FiClipboard className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
          </button>
        </div>

        {validationError && (
          <p className="text-red-600 dark:text-red-400 text-xs sm:text-sm pl-1 font-semibold animate-pulse">
            {validationError}
          </p>
        )}

        {/* Action button */}
        <button
          type="submit"
          disabled={isLoading || !url.trim()}
          className="w-full flex items-center justify-center gap-2 py-3.5 sm:py-4 rounded-2xl font-bold text-white bg-red-600 hover:bg-red-500 active:scale-[0.98] disabled:scale-100 disabled:opacity-40 shadow-[0_4px_14px_rgba(220,38,38,0.25)] hover:shadow-[0_6px_20px_rgba(220,38,38,0.35)] disabled:shadow-none transition-all duration-200 text-sm sm:text-base cursor-pointer outline-none"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Parsing Video...</span>
            </div>
          ) : (
            <>
              <span>Get Transcript</span>
              <FiArrowRight className="w-4.5 h-4.5" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
