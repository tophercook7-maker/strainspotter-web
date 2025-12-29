"use client";

/**
 * Reset Supabase storage - clears all corrupted auth tokens
 * Must be called BEFORE any Supabase client is initialized
 */
export function resetSupabaseStorage() {
  if (typeof window === "undefined") return;

  try {
    // Find and delete all Supabase auth tokens
    // Supabase stores tokens with pattern: sb-<project-ref>-auth-token
    const keysToDelete: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes("sb-") && key.includes("-auth-token"))) {
        keysToDelete.push(key);
      }
    }

    // Delete all Supabase auth tokens
    keysToDelete.forEach((key) => {
      localStorage.removeItem(key);
    });

    // Also clear sessionStorage
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (key.includes("sb-") && key.includes("-auth-token"))) {
        sessionStorage.removeItem(key);
      }
    }

    if (keysToDelete.length > 0) {
      console.log(`🧹 Reset ${keysToDelete.length} Supabase auth token(s) from storage`);
    }
  } catch (error) {
    console.error("Error resetting Supabase storage:", error);
  }
}

