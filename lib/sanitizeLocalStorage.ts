"use client";

/**
 * Sanitized localStorage wrapper
 * Strips non-ISO-8859-1 characters from values before storage
 * Prevents corrupted tokens from reaching Headers() constructor
 */

export function sanitizeToken(token: string | null | undefined) {
  if (!token) return token;
  return token.replace(/[^\x00-\xFF]/g, "");
}

/**
 * Install sanitized localStorage wrapper
 * Must be called before Supabase client initialization
 */
export function installSanitizedLocalStorage() {
  if (typeof window === "undefined") return;

  const originalSetItem = Storage.prototype.setItem;
  const originalGetItem = Storage.prototype.getItem;

  // Wrap setItem to sanitize values before storage
  Storage.prototype.setItem = function (key: string, value: string) {
    // Sanitize auth-related keys (Supabase stores tokens here)
    if (
      key.includes("auth") ||
      key.includes("token") ||
      key.includes("session") ||
      key.includes("supabase")
    ) {
      const sanitized = sanitizeToken(value);
      if (sanitized) {
        return originalSetItem.call(this, key, sanitized);
      }
    }
    return originalSetItem.call(this, key, value);
  };

  // Wrap getItem to sanitize values on retrieval (in case they were stored before sanitization)
  Storage.prototype.getItem = function (key: string): string | null {
    const value = originalGetItem.call(this, key);
    if (
      value &&
      (key.includes("auth") ||
        key.includes("token") ||
        key.includes("session") ||
        key.includes("supabase"))
    ) {
      const sanitized = sanitizeToken(value);
      if (sanitized && sanitized !== value) {
        // Update stored value if it was sanitized
        originalSetItem.call(this, key, sanitized);
        return sanitized;
      }
      return sanitized;
    }
    return value;
  };

  console.log("🛡️ Sanitized localStorage wrapper installed");
}

