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

// Memoize public route children to prevent remounts
const MemoizedPublicChildren = memo(function PublicChildren({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
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

  useEffect(() => {
    console.log(`[CONDITIONAL_APP_SHELL] Render #${conditionalAppShellRenderCount}, ID: ${renderId.current}, Pathname: ${pathname}`);
  });

  // Memoize children to prevent remounts when ConditionalAppShell re-renders
  const memoizedChildren = useMemo(() => children, [children]);

  // Public routes get NO providers - completely isolated
  // This prevents any auth state changes from affecting login
  if (pathname === "/login" || pathname?.startsWith("/auth/")) {
    return <MemoizedPublicChildren>{memoizedChildren}</MemoizedPublicChildren>;
  }

  // All other routes get full app shell
  return <MemoizedAppShell>{memoizedChildren}</MemoizedAppShell>;
}
