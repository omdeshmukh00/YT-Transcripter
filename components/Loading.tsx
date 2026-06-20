'use client';

import React, { useState, useEffect } from 'react';

interface LoadingProps {
  statusText?: string;
}

const DEFAULT_STEPS = [
  'Connecting to YouTube API...',
  'Locating original captions...',
  'Extracting transcript timestamps...',
  'Formatting for PDF layout...',
  'Compiling Unicode characters...'
];

export default function Loading({ statusText }: LoadingProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    if (statusText) return; // Skip automatic rotation if custom statusText is provided
    
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => (prev < DEFAULT_STEPS.length - 1 ? prev + 1 : prev));
    }, 2500);

    return () => clearInterval(interval);
  }, [statusText]);

  const activeText = statusText || DEFAULT_STEPS[currentStepIndex];

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-zinc-900/40 border border-zinc-800 rounded-3xl backdrop-blur-md">
      {/* Glowing Spinner */}
      <div className="relative w-20 h-20 flex items-center justify-center">
        {/* Outer glowing pulsing circle */}
        <div className="absolute inset-0 rounded-full bg-red-600/10 blur-xl animate-pulse" />
        
        {/* Spinner rings */}
        <div className="absolute inset-0 border-4 border-zinc-800 rounded-full" />
        <div className="absolute inset-0 border-4 border-t-red-600 border-r-rose-600 rounded-full animate-spin [animation-duration:1.2s]" />
        
        {/* Inner static dot */}
        <div className="w-4 h-4 bg-zinc-700 rounded-full animate-ping [animation-duration:1.8s]" />
      </div>

      {/* Progress Step Text */}
      <div className="mt-6 text-center">
        <h3 className="text-zinc-100 font-semibold text-base sm:text-lg animate-pulse">
          Fetching Transcript
        </h3>
        
        <p className="mt-2 text-zinc-400 text-sm sm:text-base max-w-xs transition-all duration-300">
          {activeText}
        </p>
      </div>

      {/* Progress bar animation */}
      <div className="mt-6 w-48 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-red-600 to-rose-600 rounded-full transition-all duration-1000"
          style={{ width: `${statusText ? 80 : (currentStepIndex + 1) * 20}%` }}
        />
      </div>
    </div>
  );
}
