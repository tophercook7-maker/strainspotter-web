"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * Desktop Access Gate
 * Checks desktop access on app load and redirects if denied
 */
export default function DesktopAccessGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    // Check if we're in Tauri desktop app
    const desktop = typeof window !== 'undefined' && 
      (window as any).__TAURI__ !== undefined;

    setIsDesktop(desktop);

    if (!desktop) {
      return; // Not desktop, no check needed
    }

    // Skip check on access-denied page to avoid loop
    if (pathname === '/desktop-access-denied' || pathname === '/desktop-access-check') {
      return;
    }

    // Check access
    async function checkAccess() {
      try {
        const res = await fetch("/api/desktop/check-access");
        const data = await res.json();
        
        if (!data.authorized) {
          // Redirect to access denied page
          router.replace("/desktop-access-denied");
        }
      } catch (error) {
        console.error("Error checking desktop access:", error);
        // On error, allow through (fail open for now)
      }
    }

    checkAccess();
  }, [router, pathname]);

  return (
    <>
      {children}
    </>
  );
}
