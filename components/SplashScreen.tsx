'use client';

import React, { useState, useEffect } from 'react';

interface SplashScreenProps {
  onComplete?: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isFading, setIsFading] = useState(false);
  const [shouldRender, setShouldRender] = useState(true);

  useEffect(() => {
    // Keep splash screen visible for a smooth opening duration (e.g. 900ms)
    // then trigger the fade out animation
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, 900);

    // Unmount and trigger callback after the fade out transition completes (e.g. 400ms transition)
    const unmountTimer = setTimeout(() => {
      setShouldRender(false);
      if (onComplete) onComplete();
    }, 1300);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(unmountTimer);
    };
  }, [onComplete]);

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background transition-all duration-[400ms] cubic-bezier(0.16, 1, 0.3, 1) ${
        isFading ? 'opacity-0 scale-[1.03] pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      <div className="flex flex-col items-center gap-4 animate-pulse">
        {/* Centered App Logo */}
        <div
          role="img"
          aria-label="YT Transcripter"
          className="w-16 h-16 sm:w-20 sm:h-20 bg-cover bg-center rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.25)]"
          style={{ backgroundImage: "url('/icon.png')" }}
        />
        
        {/* Centered Title text */}
        <div className="text-center mt-2">
          <h2 className="text-sm font-bold tracking-widest text-zinc-400 dark:text-zinc-500 uppercase text-[10px]">
            YT Transcripter
          </h2>
          <p className="text-[10px] text-zinc-500 font-medium mt-1 font-mono">
            Loading...
          </p>
        </div>
      </div>
    </div>
  );
}
