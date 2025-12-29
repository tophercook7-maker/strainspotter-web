"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";

// Public routes that don't require auth
const PUBLIC_ROUTES = ["/", "/auth/login", "/auth/signup", "/auth/callback"];

export default function AuthWall({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Allow public routes
    if (PUBLIC_ROUTES.includes(pathname)) {
      return;
    }

    // If not loading and no user, redirect to login
    if (!loading && !user) {
      router.replace("/auth/login");
    }
  }, [user, loading, pathname, router]);

  // Show nothing while loading
  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading…</p>
        </div>
      </div>
    );
  }

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

