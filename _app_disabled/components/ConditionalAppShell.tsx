"use client";

import { usePathname } from "next/navigation";
import { memo, useRef, useEffect, useMemo } from "react";
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

// Separate component for public routes that never re-renders
const PublicRouteWrapper = memo(function PublicRouteWrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}, () => true); // Never re-render

let conditionalAppShellRenderCount = 0;

export default function ConditionalAppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  conditionalAppShellRenderCount++;
  const renderId = useRef(Math.random().toString(36).substring(7));
  const pathname = usePathname();
  
  const isPublicRoute = pathname === "/login" || pathname?.startsWith("/auth/") || pathname?.startsWith("/(public)/");
  
  // Store children in a ref for public routes to prevent remounts
  const publicChildrenRef = useRef<React.ReactNode>(null);
  if (isPublicRoute && publicChildrenRef.current === null) {
    publicChildrenRef.current = children;
  }
  
  // Reset ref when leaving public routes
  if (!isPublicRoute) {
    publicChildrenRef.current = null;
  }

  useEffect(() => {
    console.log(`[CONDITIONAL_APP_SHELL] Render #${conditionalAppShellRenderCount}, ID: ${renderId.current}, Pathname: ${pathname}, IsPublic: ${isPublicRoute}`);
  });

  // Public routes get NO providers - completely isolated
  // Use ref to prevent remounts when ConditionalAppShell re-renders
  if (isPublicRoute) {
    return <PublicRouteWrapper>{publicChildrenRef.current || children}</PublicRouteWrapper>;
  }

  // All other routes get full app shell
  return <MemoizedAppShell>{children}</MemoizedAppShell>;
}
