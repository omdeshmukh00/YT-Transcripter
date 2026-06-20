import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'YT Transcripter',
    short_name: 'YTTranscripter',
    description: 'Instantly download and preview clean PDF transcripts of YouTube videos with full Unicode support.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#09090b', // dark background (zinc-950)
    theme_color: '#dc2626', // red-600
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      }
    ],
    share_target: {
      action: '/',
      method: 'GET' as const,
      params: {
        title: 'title',
        text: 'text',
        url: 'url'
      }
    }
  };
}
