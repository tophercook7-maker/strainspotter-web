"use client";

/**
 * Hard reset ALL Supabase auth storage
 * Clears all Supabase-related keys from localStorage and sessionStorage
 * Must be called BEFORE any Supabase client is initialized
 */
export function resetSupabaseStorage() {
  if (typeof window === "undefined") return;

  try {
    const keysToDelete: string[] = [];
    
    // Clear ALL Supabase-related keys from localStorage
    // Pattern: sb-<project-ref>-auth-token, supabase.auth.token, etc.
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith("sb-") ||
        key.includes("supabase") ||
        key.includes("auth-token") ||
        key.includes("sb-auth")
      )) {
        keysToDelete.push(key);
      }
    }

    // Delete all Supabase keys from localStorage
    keysToDelete.forEach((key) => {
      localStorage.removeItem(key);
    });

    // Clear ALL Supabase-related keys from sessionStorage
    const sessionKeysToDelete: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (
        key.startsWith("sb-") ||
        key.includes("supabase") ||
        key.includes("auth-token") ||
        key.includes("sb-auth")
      )) {
        sessionKeysToDelete.push(key);
      }
    }

    // Delete all Supabase keys from sessionStorage
    sessionKeysToDelete.forEach((key) => {
      sessionStorage.removeItem(key);
    });

    const totalDeleted = keysToDelete.length + sessionKeysToDelete.length;
    if (totalDeleted > 0) {
      console.log(`🧹 Hard reset: Deleted ${totalDeleted} Supabase auth key(s) from storage`);
    }
  } catch (error) {
    console.error("Error resetting Supabase storage:", error);
  }
}

// Run reset immediately at module load (before any Supabase client can be created)
if (typeof window !== "undefined") {
  resetSupabaseStorage();
}

