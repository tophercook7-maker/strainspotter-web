"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { PortalProvider } from "./portal/PortalController";
import ResponsiveShell from "@/components/layout/ResponsiveShell";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import AuthWall from "@/components/AuthWall";

export default function ConditionalAppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Memoize the public route check to prevent unnecessary rerenders
  const isPublicRoute = useMemo(() => {
    return pathname === "/login" || pathname?.startsWith("/auth/");
  }, [pathname]);

  // Public routes get NO providers - completely isolated
  // This prevents any auth state changes from affecting login
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // All other routes get full app shell
  return (
    <AuthProvider>
      <AuthWall>
        <PortalProvider>
          <ResponsiveShell>{children}</ResponsiveShell>
        </PortalProvider>
      </AuthWall>
    </AuthProvider>
  );
}
