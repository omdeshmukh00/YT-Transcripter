'use client';

import React from 'react';
import { FiDownload, FiLoader } from 'react-icons/fi';

interface DownloadButtonProps {
  onClick: () => void;
  isLoading: boolean;
  disabled?: boolean;
  className?: string;
  variant?: 'primary' | 'secondary';
}

export default function DownloadButton({
  onClick,
  isLoading,
  disabled = false,
  className = '',
  variant = 'primary',
}: DownloadButtonProps) {
  const isButtonDisabled = disabled || isLoading;

  const baseStyles = "flex items-center justify-center gap-2 font-semibold rounded-2xl active:scale-[0.98] transition-all duration-300 px-5 py-3 text-sm sm:text-base";
  
  const variantStyles = variant === 'primary'
    ? "text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-[0_4px_15px_-3px_rgba(220,38,38,0.3)] disabled:shadow-none"
    : "text-zinc-200 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60";

  return (
    <button
      onClick={onClick}
      disabled={isButtonDisabled}
      className={`${baseStyles} ${variantStyles} ${className} disabled:opacity-40 disabled:scale-100`}
    >
      {isLoading ? (
        <>
          <FiLoader className="w-5 h-5 animate-spin" />
          <span>Generating PDF...</span>
        </>
      ) : (
        <>
          <FiDownload className="w-5 h-5" />
          <span>Download PDF</span>
        </>
      )}
    </button>
  );
}
