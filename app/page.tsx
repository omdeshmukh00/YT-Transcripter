'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { FiAlertTriangle, FiWifiOff, FiInfo } from 'react-icons/fi';
import UrlInput from '../components/UrlInput';
import Loading from '../components/Loading';
import TranscriptPreview from '../components/TranscriptPreview';
import PdfPreviewModal from '../components/PdfPreviewModal';
import HistorySection, { HistoryItem } from '../components/HistorySection';
import PdfTemplate from '../components/PdfTemplate';
import ThemeToggle from '../components/ThemeToggle';
import SplashScreen from '../components/SplashScreen';
import { generatePdfClient } from '../lib/pdf-generator';
import { TranscriptResponse, TranscriptLine } from '../services/transcript.service';



const HISTORY_KEY = 'yt-transcripter-history';

const getErrorMessage = (err: unknown, fallback: string): string => {
  return err instanceof Error && err.message ? err.message : fallback;
};

const isAbortError = (err: unknown): boolean => {
  return err instanceof DOMException
    ? err.name === 'AbortError'
    : err instanceof Error && err.name === 'AbortError';
};

export default function Home() {
  // Application State
  const [activeVideo, setActiveVideo] = useState<TranscriptResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  
  // PDF Compilation Cache (avoid recompiles for the same video)
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const pdfBlobUrlRef = useRef<string | null>(null);

  // PDF Compile Data State (for hidden client-side page rendering)
  const [pdfCompileData, setPdfCompileData] = useState<{ title: string; url: string; transcript: TranscriptLine[] } | null>(null);

  // Helper to sanitize filenames for OS download while preserving Unicode/Devanagari characters
  const getSafeFilename = (title: string): string => {
    return title
      .replace(/[\\/:*?"<>|]/g, '_')
      .trim()
      .substring(0, 60) || 'transcript';
  };


  // History & Offline state
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isOffline, setIsOffline] = useState(() => {
    if (typeof window !== 'undefined') {
      return !navigator.onLine;
    }
    return false;
  });
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null); // videoId compiling PDF in history card
  const [isMounted, setIsMounted] = useState(false);

  // Set isMounted to true on client hydration
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);


  // Preview Modal state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewVideoUrl, setPreviewVideoUrl] = useState('');

  // 1. Monitor network connectivity status
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const goOnline = () => setIsOffline(false);
      const goOffline = () => setIsOffline(true);
      
      window.addEventListener('online', goOnline);
      window.addEventListener('offline', goOffline);
      return () => {
        window.removeEventListener('online', goOnline);
        window.removeEventListener('offline', goOffline);
      };
    }
  }, []);

  // 2. Load search history and language preferences from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(HISTORY_KEY);
    const savedLang = localStorage.getItem('yt-transcripter-pref-lang');
    
    const timer = setTimeout(() => {
      if (saved) {
        try {
          setHistory(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to parse history from localStorage:', e);
        }
      }
      if (savedLang) {
        setPreferredLanguage(savedLang);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // Keep the current Blob URL alive for previews, and revoke it only when replacing or unmounting.
  useEffect(() => {
    pdfBlobUrlRef.current = pdfBlobUrl;
  }, [pdfBlobUrl]);

  useEffect(() => {
    return () => {
      if (pdfBlobUrlRef.current) {
        URL.revokeObjectURL(pdfBlobUrlRef.current);
      }
    };
  }, []);

  const clearPdfCache = useCallback(() => {
    if (pdfBlobUrlRef.current) {
      URL.revokeObjectURL(pdfBlobUrlRef.current);
      pdfBlobUrlRef.current = null;
    }
    setPdfBlobUrl(null);
    setPdfBlob(null);
  }, []);

  // 3. Search and parse YouTube URL
  const handleSearch = useCallback(async (url: string) => {
    if (isOffline) {
      setError('You are offline. Please restore connection to fetch new transcripts.');
      return;
    }

    setIsLoading(true);
    setError(null);
    clearPdfCache();
    setActiveVideo(null);

    try {
      const res = await fetch('/api/transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, lang: preferredLanguage }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch transcript details.');
      }

      setActiveVideo(data);

      // Save item to local storage history
      const newItem: HistoryItem = {
        id: data.videoId,
        title: data.title,
        url: data.url,
        thumbnail: data.thumbnailUrl,
        language: data.language,
        languageCode: data.languageCode,
        availableLanguages: data.availableLanguages,
        duration: data.duration,
        generatedAt: new Date().toISOString(),
        transcript: data.transcript,
      };

      const updatedHistory = [newItem, ...history.filter((item) => item.id !== newItem.id)].slice(0, 25);
      setHistory(updatedHistory);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));

    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message || 'An error occurred while parsing the video.');
    } finally {
      setIsLoading(false);
    }
  }, [isOffline, preferredLanguage, history, clearPdfCache]);

  // 3a. Listen to incoming shared links on mount (Web Share Target)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const sharedUrl = searchParams.get('url');
      const sharedText = searchParams.get('text');
      const sharedTitle = searchParams.get('title');

      const findYtUrl = (str: string | null): string | null => {
        if (!str) return null;
        const matches = str.match(/https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\/[^\s]+/gi);
        return matches ? matches[0] : null;
      };

      const ytUrl = findYtUrl(sharedUrl) || findYtUrl(sharedText) || findYtUrl(sharedTitle);

      if (ytUrl) {
        // Clear parameters from the URL address bar immediately
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);

        // Parse the shared video link
        const timer = setTimeout(() => {
          handleSearch(ytUrl);
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [history, handleSearch]);

  // 4. Compile PDF from Active Video details (Client-side Page-by-Page HTML-to-Canvas-to-PDF)
  const compilePdfBlob = async (video: { title: string; url: string; transcript: TranscriptLine[] }): Promise<{ blob: Blob; url: string }> => {
    // 1. Render data to hidden PdfTemplate
    setPdfCompileData(video);
    
    // 2. Wait for template component to mount/render fully
    await new Promise((resolve) => setTimeout(resolve, 350));
    
    try {
      // 3. Compile canvas segments into PDF blob client-side
      const blob = await generatePdfClient('pdf-template-container');
      const url = URL.createObjectURL(blob);
      return { blob, url };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('Client-side PDF generation error:', error);
      throw new Error(error.message || 'Failed to compile PDF.');
    } finally {
      // 4. Clear compile data to unmount template
      setPdfCompileData(null);
    }
  };


  // 5. Trigger PDF Download
  const handleDownload = async () => {
    if (!activeVideo) return;
    setIsPdfLoading(true);
    try {
      let currentBlob = pdfBlob;
      let currentUrl = pdfBlobUrl;

      // Compile if not cached in state
      if (!currentBlob || !currentUrl) {
        const result = await compilePdfBlob(activeVideo);
        currentBlob = result.blob;
        currentUrl = result.url;
        setPdfBlob(currentBlob);
        setPdfBlobUrl(currentUrl);
      }

      // Trigger standard browser download
      const safeTitle = getSafeFilename(activeVideo.title);
      const a = document.createElement('a');
      a.href = currentUrl;
      a.download = `${safeTitle}_transcript.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      alert(getErrorMessage(err, 'Error downloading PDF.'));
    } finally {
      setIsPdfLoading(false);
    }
  };

  // 6. Open PDF Preview Modal
  const handlePreview = async () => {
    if (!activeVideo) return;
    
    setPreviewTitle(activeVideo.title);
    setPreviewVideoUrl(activeVideo.url);
    setIsPreviewOpen(true);

    if (pdfBlobUrl) return; // Use already cached PDF

    setIsPdfLoading(true);
    try {
      const result = await compilePdfBlob(activeVideo);
      setPdfBlob(result.blob);
      setPdfBlobUrl(result.url);
    } catch (err) {
      alert(getErrorMessage(err, 'Error generating PDF preview.'));
      setIsPreviewOpen(false);
    } finally {
      setIsPdfLoading(false);
    }
  };

  // 7. Share PDF Document with fallbacks
  const handleShare = async () => {
    if (!activeVideo) return;
    
    setIsPdfLoading(true);
    try {
      let currentBlob = pdfBlob;
      let currentUrl = pdfBlobUrl;

      if (!currentBlob || !currentUrl) {
        const result = await compilePdfBlob(activeVideo);
        currentBlob = result.blob;
        currentUrl = result.url;
        setPdfBlob(currentBlob);
        setPdfBlobUrl(currentUrl);
      }

      const safeTitle = getSafeFilename(activeVideo.title);
      const file = new File([currentBlob], `${safeTitle}_transcript.pdf`, { type: 'application/pdf' });

      // Check if sharing files is supported (mostly mobile browsers)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: activeVideo.title,
          text: `Check out the transcript for "${activeVideo.title}"!`,
        });
      } else if (navigator.share) {
        // Fallback to sharing details/link
        await navigator.share({
          title: activeVideo.title,
          text: `Transcript of YouTube video: ${activeVideo.title}`,
          url: activeVideo.url,
        });
      } else {
        // Ultimate fallback: Copy URL to clipboard and notify
        await navigator.clipboard.writeText(`${activeVideo.title} - ${activeVideo.url}`);
        alert('Video title and link copied to clipboard! Share it anywhere.');
      }
    } catch (err) {
      if (!isAbortError(err)) {
        // Copy to clipboard fallback if user cancels or sharing fails
        navigator.clipboard.writeText(`${activeVideo.title} - ${activeVideo.url}`);
        alert('Sharing could not be completed. Copying link to clipboard instead.');
      }
    } finally {
      setIsPdfLoading(false);
    }
  };

  // 8. History Card Interactions (Download/Preview/Share directly from history)
  const handlePreviewHistoryItem = async (item: HistoryItem) => {
    setPreviewTitle(item.title);
    setPreviewVideoUrl(item.url);
    setIsPreviewOpen(true);
    setIsPdfLoading(true);

    try {
      const result = await compilePdfBlob(item);
      setPdfBlob(result.blob);
      setPdfBlobUrl(result.url);
    } catch (err) {
      alert(getErrorMessage(err, 'Error generating PDF preview.'));
      setIsPreviewOpen(false);
    } finally {
      setIsPdfLoading(false);
    }
  };

  const handleDownloadHistoryItem = async (item: HistoryItem) => {
    setIsActionLoading(item.id);
    try {
      const result = await compilePdfBlob(item);
      const safeTitle = getSafeFilename(item.title);
      
      const a = document.createElement('a');
      a.href = result.url;
      a.download = `${safeTitle}_transcript.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(result.url);
    } catch (err) {
      alert(getErrorMessage(err, 'Error downloading PDF.'));
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleShareHistoryItem = async (item: HistoryItem) => {
    setIsActionLoading(item.id);
    try {
      const result = await compilePdfBlob(item);
      const safeTitle = getSafeFilename(item.title);
      const file = new File([result.blob], `${safeTitle}_transcript.pdf`, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: item.title,
          text: `Check out the transcript for "${item.title}"!`,
        });
      } else if (navigator.share) {
        await navigator.share({
          title: item.title,
          text: `Transcript of YouTube video: ${item.title}`,
          url: item.url,
        });
      } else {
        await navigator.clipboard.writeText(`${item.title} - ${item.url}`);
        alert('Video title and link copied to clipboard!');
      }
      URL.revokeObjectURL(result.url);
    } catch (err) {
      if (!isAbortError(err)) {
        navigator.clipboard.writeText(`${item.title} - ${item.url}`);
        alert('Copying link to clipboard instead.');
      }
    } finally {
      setIsActionLoading(null);
    }
  };

  const handlePreviewDownload = () => {
    if (!pdfBlobUrl) return;

    const safeTitle = getSafeFilename(previewTitle || 'transcript');
    const a = document.createElement('a');
    a.href = pdfBlobUrl;
    a.download = `${safeTitle}_transcript.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePreviewShare = async () => {
    if (!pdfBlob || !pdfBlobUrl) return;

    const safeTitle = getSafeFilename(previewTitle || 'transcript');
    const file = new File([pdfBlob], `${safeTitle}_transcript.pdf`, { type: 'application/pdf' });

    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: previewTitle,
          text: `Check out the transcript for "${previewTitle}"!`,
        });
      } else if (navigator.share && previewVideoUrl) {
        await navigator.share({
          title: previewTitle,
          text: `Transcript of YouTube video: ${previewTitle}`,
          url: previewVideoUrl,
        });
      } else if (previewVideoUrl) {
        await navigator.clipboard.writeText(`${previewTitle} - ${previewVideoUrl}`);
        alert('Video title and link copied to clipboard!');
      } else {
        await navigator.clipboard.writeText(previewTitle);
        alert('Transcript title copied to clipboard!');
      }
    } catch (err) {
      if (!isAbortError(err)) {
        if (previewVideoUrl) {
          await navigator.clipboard.writeText(`${previewTitle} - ${previewVideoUrl}`);
          alert('Sharing could not be completed. Copying link to clipboard instead.');
        } else {
          alert(getErrorMessage(err, 'Sharing could not be completed.'));
        }
      }
    }
  };

  const handleSelectHistoryItem = (item: HistoryItem) => {
    clearPdfCache();
    setActiveVideo({
      videoId: item.id,
      title: item.title,
      url: item.url,
      thumbnailUrl: item.thumbnail,
      duration: item.duration,
      language: item.language,
      languageCode: item.languageCode || 'en',
      availableLanguages: item.availableLanguages || [{ code: item.languageCode || 'en', name: item.language }],
      transcript: item.transcript,
    });
    // Scroll smoothly to preview section
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 3b. Switch caption language for active video
  const handleLanguageChange = async (langCode: string) => {
    if (!activeVideo) return;
    
    setIsLoading(true);
    setError(null);
    clearPdfCache();

    try {
      const res = await fetch('/api/transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: activeVideo.url, lang: langCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to switch transcript language.');
      }

      setActiveVideo(data);

      // Save to localStorage preferred lang
      setPreferredLanguage(langCode);
      localStorage.setItem('yt-transcripter-pref-lang', langCode);

      // Update item in local storage history
      const updatedHistory = history.map((item) => {
        if (item.id === data.videoId) {
          return {
            ...item,
            language: data.language,
            languageCode: data.languageCode,
            availableLanguages: data.availableLanguages,
            transcript: data.transcript,
          };
        }
        return item;
      });
      setHistory(updatedHistory);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));

    } catch (err) {
      setError(getErrorMessage(err, 'An error occurred while switching languages.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteHistoryItem = (id: string) => {
    const updated = history.filter((item) => item.id !== id);
    setHistory(updated);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    if (activeVideo && activeVideo.videoId === id) {
      clearPdfCache();
      setActiveVideo(null);
    }
  };

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear all history?')) {
      setHistory([]);
      localStorage.removeItem(HISTORY_KEY);
    }
  };

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 flex flex-col justify-between">
      
      {/* YouTube App-Opening Splash Screen */}
      <SplashScreen />

      {/* Circular Floating Theme Selector */}
      <ThemeToggle />
      
      {/* Offline Active Indicator */}
      {isOffline && (
        <div className="mb-6 w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-semibold text-sm animate-pulse shadow-[0_0_15px_-3px_rgba(245,158,11,0.2)]">
          <FiWifiOff className="w-5 h-5 flex-shrink-0" />
          <span>Offline Mode Active (Using Local History)</span>
        </div>
      )}

      {/* Main Branding Section */}
      <main className="flex-1 flex flex-col gap-8">
        
        {/* App Title & Slogan matching the uploaded screenshot */}
        <div className="text-center py-4 font-sans">
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4">
            <Image
              src="/icon.png"
              alt="YT Transcripter"
              width={64}
              height={64}
              className="w-full h-full object-contain rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.25)]"
              priority
            />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 leading-none">
            YT Transcripter
          </h1>
          <p className="mt-3 text-zinc-550 dark:text-zinc-400 text-xs sm:text-sm max-w-md mx-auto leading-relaxed font-medium">
            One-click workflow to parse YouTube subtitles and compile them into clean, Unicode-friendly PDF transcripts.
          </p>
        </div>

        {/* URL Input Form Card */}
        <div className="bg-white dark:bg-zinc-900/35 border border-zinc-200 dark:border-zinc-800/80 rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-lg backdrop-blur-md">
          <UrlInput onSearch={handleSearch} isLoading={isLoading} />
        </div>

        {/* Dynamic Display Panel: Loading | Error | Active Preview */}
        {isLoading && (
          <div className="flex justify-center py-6">
            <Loading />
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3.5 p-5 bg-red-550/10 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-3xl text-sm leading-relaxed animate-fade-in shadow-[0_0_20px_-5px_rgba(239,68,68,0.06)]">
            <FiAlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold">Error retrieving transcript:</span>{' '}
              {error}
              <div className="mt-2 text-zinc-500 dark:text-zinc-400 text-xs font-medium flex items-center gap-1.5">
                <FiInfo className="w-3.5 h-3.5" />
                Please verify if the video link is correct and has captions enabled.
              </div>
            </div>
          </div>
        )}

        {activeVideo && !isLoading && (
          <div className="animate-fade-in">
            <TranscriptPreview
              title={activeVideo.title}
              videoUrl={activeVideo.url}
              thumbnailUrl={activeVideo.thumbnailUrl}
              duration={activeVideo.duration}
              transcript={activeVideo.transcript}
              onDownload={handleDownload}
              onPreview={handlePreview}
              onShare={handleShare}
              isPdfLoading={isPdfLoading}
              availableLanguages={activeVideo.availableLanguages}
              activeLanguageCode={activeVideo.languageCode}
              onLanguageChange={handleLanguageChange}
            />
          </div>
        )}

        {/* Local Caching History */}
        {!isLoading && (
          <div className="mt-4 animate-fade-in">
            <HistorySection
              items={history}
              onSelect={handleSelectHistoryItem}
              onDelete={handleDeleteHistoryItem}
              onClearAll={handleClearHistory}
              onPreview={handlePreviewHistoryItem}
              onDownload={handleDownloadHistoryItem}
              onShare={handleShareHistoryItem}
              isActionLoading={isActionLoading}
              isLoading={!isMounted}
            />
          </div>
        )}



      </main>

      {/* Hidden PDF template for canvas generation */}
      <div id="pdf-template-container" className="fixed -left-[9999px] -top-[9999px] bg-zinc-950">
        {pdfCompileData ? (
          <PdfTemplate
            title={pdfCompileData.title}
            videoUrl={pdfCompileData.url}
            transcript={pdfCompileData.transcript}
          />
        ) : activeVideo ? (
          <PdfTemplate
            title={activeVideo.title}
            videoUrl={activeVideo.url}
            transcript={activeVideo.transcript}
          />
        ) : null}
      </div>

      {/* Footer Branding */}
      <footer className="mt-16 py-6 border-t border-zinc-200 dark:border-zinc-900 text-center text-xs text-zinc-500 dark:text-zinc-600 flex flex-col sm:flex-row items-center justify-between gap-3 font-sans">
        <div>
          © {new Date().getFullYear()} YT Transcripter by Om Deshmukh. All rights reserved.
        </div>
        <div className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-750">
          <span>Unicode PDF Generation Engine v1.0</span>
        </div>
      </footer>

      {/* PDF Inline Preview Drawer/Modal */}
      <PdfPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        pdfBlobUrl={pdfBlobUrl}
        title={previewTitle}
        onDownload={handlePreviewDownload}
        onShare={handlePreviewShare}
        isLoading={isPdfLoading}
      />
    </div>
  );
}
