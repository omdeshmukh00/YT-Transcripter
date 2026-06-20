'use client';

import { useEffect } from 'react';

export default function PwaRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Automatically unregister service workers in development to prevent HMR and hot-reload loops
      if (process.env.NODE_ENV !== 'production') {
        if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('sw-dev-cleared') !== 'true') {
          navigator.serviceWorker.getRegistrations().then((registrations) => {
            if (registrations.length > 0) {
              console.log('Clearing active dev service workers...');
              Promise.all(registrations.map(r => r.unregister())).then(() => {
                sessionStorage.setItem('sw-dev-cleared', 'true');
                console.log('Dev service workers cleared. Reloading page...');
                window.location.reload();
              });
            }
          });
        }
        return;
      }

      // Register the service worker in production after the page loads
      const handleLoad = () => {
        navigator.serviceWorker
          .register('/sw.js', { scope: '/' })
          .then((registration) => {
            console.log('PWA Service Worker registered successfully:', registration.scope);
          })
          .catch((error) => {
            console.error('PWA Service Worker registration failed:', error);
          });
      };

      if (document.readyState === 'complete') {
        handleLoad();
      } else {
        window.addEventListener('load', handleLoad);
        return () => window.removeEventListener('load', handleLoad);
      }
    }
  }, []);

  return null;
}
