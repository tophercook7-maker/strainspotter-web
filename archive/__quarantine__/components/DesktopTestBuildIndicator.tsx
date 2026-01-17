"use client";

/**
 * Desktop Test Build Indicator
 * Shows subtle "Early Test Build" text when DESKTOP_TEST_BUILD is enabled
 * No banners, no popups - just quiet indication
 */
export default function DesktopTestBuildIndicator() {
  // Only show in Tauri desktop app
  const isDesktop = typeof window !== 'undefined' && 
    (window as any).__TAURI__ !== undefined;

  if (!isDesktop) {
    return null;
  }

  // Check if test build flag is enabled
  const isTestBuild = process.env.NEXT_PUBLIC_DESKTOP_TEST_BUILD === 'true';

  if (!isTestBuild) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none md:block hidden">
      <div className="max-w-6xl mx-auto px-6 pb-2">
        <p className="text-xs text-white/40 text-center font-mono">
          StrainSpotter — Early Test Build
        </p>
      </div>
    </div>
  );
}
