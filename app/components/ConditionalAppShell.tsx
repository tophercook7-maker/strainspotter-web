"use client";

import { usePathname } from "next/navigation";
import { memo } from "react";
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

export default function ConditionalAppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Public routes get NO providers - completely isolated
  // This prevents any auth state changes from affecting login
  if (pathname === "/login" || pathname?.startsWith("/auth/")) {
    return <>{children}</>;
  }

  // All other routes get full app shell
  return <MemoizedAppShell>{children}</MemoizedAppShell>;
}
