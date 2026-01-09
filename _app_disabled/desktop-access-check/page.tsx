"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Desktop Access Check Page
 * This page is loaded first in the desktop app to verify access
 * If access is denied, shows access denied page
 * If authorized, redirects to home
 */
export default function DesktopAccessCheckPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkAccess() {
      try {
        const res = await fetch("/api/desktop/check-access");
        const data = await res.json();
        
        if (data.authorized) {
          setAuthorized(true);
          // Redirect to home
          router.replace("/");
        } else {
          setChecking(false);
          setError(data.message || "Access denied");
          // Redirect to access denied page
          router.replace("/api/desktop/access-denied");
        }
      } catch (err: any) {
        console.error("Error checking desktop access:", err);
        setChecking(false);
        setError("Failed to check access. Please try again.");
        // On error, redirect to access denied
        router.replace("/api/desktop/access-denied");
      }
    }

    // Only check if we're in a desktop app
    const isDesktop = typeof window !== 'undefined' && 
      (window as any).__TAURI__ !== undefined;

    if (isDesktop) {
      checkAccess();
    } else {
      // Not desktop, just redirect to home
      router.replace("/");
    }
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Checking desktop access...</p>
        </div>
      </div>
    );
  }

  // Will redirect, but show loading state
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <p>Redirecting...</p>
      </div>
    </div>
  );
}
