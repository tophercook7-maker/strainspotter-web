"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";

// Public routes that don't require auth
const PUBLIC_ROUTES = ["/", "/login", "/auth/signup", "/auth/callback"];

export default function AuthWall({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isTauri = typeof window !== "undefined" && "__TAURI__" in window;

  useEffect(() => {
    console.log("[AUTHWALL]", {
      isTauri,
      pathname,
      loading,
      user: user?.email ?? null,
    });
  }, [isTauri, pathname, loading, user]);

  const effectiveLoading = loading && !isTauri;

  useEffect(() => {
    // Allow public routes
    if (PUBLIC_ROUTES.includes(pathname)) {
      return;
    }

    // If not loading and no user, redirect to login
    if (!effectiveLoading && !user) {
      router.replace("/login");
    }
  }, [user, effectiveLoading, pathname, router]);

  // Allow public routes
  if (PUBLIC_ROUTES.includes(pathname)) {
    return <>{children}</>;
  }

  // Require auth for all other routes
  if (!user) {
    return null; // Will redirect via useEffect
  }

  return <>{children}</>;
}

