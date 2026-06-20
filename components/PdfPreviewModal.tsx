'use client';

import React, { useEffect, useState } from 'react';
import { FiX, FiDownload, FiShare2, FiLoader } from 'react-icons/fi';

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfBlobUrl: string | null;
  title: string;
  onDownload: () => void;
  onShare: () => void;
  isLoading: boolean;
}

export default function PdfPreviewModal({
  isOpen,
  onClose,
  pdfBlobUrl,
  title,
  onDownload,
  onShare,
  isLoading,
}: PdfPreviewModalProps) {
  const [isMobile, setIsMobile] = useState(false);

  // Detect if on mobile device to provide a notice (since mobile iframes for PDFs can be hit-or-miss)
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    checkMobile();
  }, []);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-5xl h-[85vh] flex flex-col bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-2xl transition-colors duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 transition-colors duration-200">
          <div className="flex-1 min-w-0 pr-4">
            <span className="text-[10px] sm:text-xs font-bold text-red-500 uppercase tracking-widest">
              PDF Preview
            </span>
            <h3 className="text-zinc-900 dark:text-zinc-100 font-semibold text-sm sm:text-base truncate" title={title}>
              {title}
            </h3>
          </div>
          
          <button
            onClick={onClose}
            className="text-zinc-550 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <FiX className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Modal Body / PDF Viewer */}
        <div className="flex-1 bg-zinc-50 dark:bg-zinc-900 flex flex-col items-center justify-center p-4 relative transition-colors duration-200">
          {isLoading ? (
            <div className="flex flex-col items-center gap-3">
              <FiLoader className="w-10 h-10 text-red-500 animate-spin" />
              <p className="text-zinc-500 dark:text-zinc-400 text-sm">Compiling PDF document...</p>
            </div>
          ) : pdfBlobUrl ? (
            <div className="w-full h-full flex flex-col">
              {isMobile && (
                <div className="mb-2 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 text-yellow-800 dark:text-yellow-300 text-xs rounded-xl p-3 text-center transition-colors">
                  Mobile devices may not display inline PDFs. Use the <strong>Download</strong> or <strong>Share</strong> options below to view the file.
                </div>
              )}
              <div className="flex-1 w-full rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 transition-colors">
                <iframe
                  src={`${pdfBlobUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                  className="w-full h-full border-none"
                  title="PDF Document Viewer"
                />
              </div>
            </div>
          ) : (
            <div className="text-center text-zinc-500 dark:text-zinc-400 text-sm">
              Failed to load PDF preview. Please try downloading it directly.
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 sm:p-5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 transition-colors duration-200">
          <div className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 text-center sm:text-left">
            YT Transcripter PDF Document
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onShare}
              disabled={isLoading || !pdfBlobUrl}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-[0.97] transition-all disabled:opacity-50"
            >
              <FiShare2 className="w-4 h-4" />
              <span>Share</span>
            </button>

            <button
              onClick={onDownload}
              disabled={isLoading || !pdfBlobUrl}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 active:scale-[0.97] transition-all disabled:opacity-50"
            >
              <FiDownload className="w-4 h-4" />
              <span>Download</span>
            </button>
          </div>
        </div>
        
      </div>
    </div>
  );
}
