"use client";

// AuthProvider intentionally simplified - no redirect logic
// Login page handles redirect explicitly after sign-in
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
