/**
 * Android Back Button Handler
 * Provides predictable back button behavior
 */

/**
 * Setup Android back button handler
 * Prevents navigation loops and ensures predictable behavior
 */
export function setupAndroidBackHandler(router: any, fallbackPath: string = '/') {
  if (typeof window === 'undefined') return;

  // Only setup on mobile/Android
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  if (!isMobile) return;

  const handleBackButton = (event: PopStateEvent) => {
    // Check if we're at the root or a safe fallback
    const currentPath = window.location.pathname;
    
    // If we're at root or fallback, allow default behavior
    if (currentPath === '/' || currentPath === fallbackPath) {
      return;
    }

    // Otherwise, navigate back in history
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackPath);
    }
  };

  window.addEventListener('popstate', handleBackButton);

  // Return cleanup function
  return () => {
    window.removeEventListener('popstate', handleBackButton);
  };
}
