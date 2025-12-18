"use client";

import { useEffect, useState } from "react";

/**
 * Desktop URL Loader
 * Monitors URL loading status and logs errors
 * Only active in Tauri desktop app
 */
export default function DesktopURLLoader() {
  const [loadStatus, setLoadStatus] = useState<{
    status: 'checking' | 'loaded' | 'error';
    error?: string;
    url?: string;
  }>({ status: 'checking' });

  useEffect(() => {
    // Only run in Tauri desktop app
    const isDesktop = typeof window !== 'undefined' && 
      (window as any).__TAURI__ !== undefined;

    if (!isDesktop) {
      return;
    }

    // Get the current URL being loaded
    const currentUrl = window.location.href;
    
    // Log initial load
    console.log('[DesktopURLLoader] Loading URL:', currentUrl);
    setLoadStatus({ status: 'checking', url: currentUrl });

    // Monitor for load errors
    const handleError = (event: ErrorEvent) => {
      const error = {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
      };
      
      console.error('[DesktopURLLoader] Load error:', error);
      setLoadStatus({
        status: 'error',
        error: `Failed to load: ${error.message}`,
        url: currentUrl,
      });

      // Log to console for debugging
      console.error('[DesktopURLLoader] Full error details:', {
        url: currentUrl,
        error: error.message,
        stack: event.error?.stack,
      });
    };

    // Monitor for successful load
    const handleLoad = () => {
      console.log('[DesktopURLLoader] Page loaded successfully:', currentUrl);
      setLoadStatus({ status: 'loaded', url: currentUrl });
    };

    // Monitor network errors
    const handleNetworkError = () => {
      console.error('[DesktopURLLoader] Network error loading:', currentUrl);
      setLoadStatus({
        status: 'error',
        error: 'Network error - failed to connect to server',
        url: currentUrl,
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('load', handleLoad);
    
    // Check if page failed to load after timeout
    const timeout = setTimeout(() => {
      if (loadStatus.status === 'checking') {
        console.warn('[DesktopURLLoader] Load timeout after 10 seconds:', currentUrl);
        setLoadStatus({
          status: 'error',
          error: 'Load timeout - page did not load within 10 seconds',
          url: currentUrl,
        });
      }
    }, 10000);

    // Check document ready state
    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      document.addEventListener('DOMContentLoaded', handleLoad);
    }

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('load', handleLoad);
      clearTimeout(timeout);
    };
  }, []);

  // Show error in console only (no UI)
  useEffect(() => {
    if (loadStatus.status === 'error') {
      console.error('[DesktopURLLoader] URL Load Failed:', {
        url: loadStatus.url,
        error: loadStatus.error,
        timestamp: new Date().toISOString(),
      });
    }
  }, [loadStatus]);

  // No UI rendering - just logging
  return null;
}
