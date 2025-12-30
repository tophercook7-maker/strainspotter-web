"use client";

import { usePathname } from "next/navigation";
import { memo, useRef, useEffect } from "react";
import { PortalProvider } from "./portal/PortalController";
import ResponsiveShell from "@/components/layout/ResponsiveShell";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import AuthWall from "@/components/AuthWall";

// Memoize the shell to prevent unnecessary rerenders
const MemoizedAppShell = memo(function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthWall>
        <PortalProvider>
          <ResponsiveShell>{children}</ResponsiveShell>
        </PortalProvider>
      </AuthWall>
    </AuthProvider>
  );
});

let conditionalAppShellRenderCount = 0;

export default function ConditionalAppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  conditionalAppShellRenderCount++;
  const renderId = useRef(Math.random().toString(36).substring(7));
  const pathname = usePathname();
  
  // Store children in a ref to prevent remounts when ConditionalAppShell re-renders
  const childrenRef = useRef(children);
  const isPublicRoute = pathname === "/login" || pathname?.startsWith("/auth/");
  const wasPublicRouteRef = useRef(isPublicRoute);
  
  // Only update children ref when route type changes (public <-> protected)
  // This prevents remounts when ConditionalAppShell re-renders for the same route type
  if (wasPublicRouteRef.current !== isPublicRoute) {
    childrenRef.current = children;
    wasPublicRouteRef.current = isPublicRoute;
  } else if (!isPublicRoute) {
    // For protected routes, always update (they need fresh children)
    childrenRef.current = children;
  }
  // For public routes, keep the same children ref to prevent remounts

  useEffect(() => {
    console.log(`[CONDITIONAL_APP_SHELL] Render #${conditionalAppShellRenderCount}, ID: ${renderId.current}, Pathname: ${pathname}, IsPublic: ${isPublicRoute}`);
  });

  // Public routes get NO providers - completely isolated
  // This prevents any auth state changes from affecting login
  if (isPublicRoute) {
    return <>{childrenRef.current}</>;
  }

  // All other routes get full app shell
  return <MemoizedAppShell>{childrenRef.current}</MemoizedAppShell>;
}
