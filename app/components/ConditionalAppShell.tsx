"use client";

import { usePathname } from "next/navigation";
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

  // Public routes get NO providers - completely isolated
  if (pathname === "/login" || pathname?.startsWith("/auth/")) {
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

