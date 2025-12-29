"use client";

/**
 * Strips non-ISO-8859-1 characters from Authorization headers.
 * Prevents browser fetch crashes caused by corrupted tokens.
 */

export function sanitizeToken(token: string | null | undefined) {
  if (!token) return token;
  return token.replace(/[^\x00-\xFF]/g, "");
}

export function installFetchSanitizer() {
  if (typeof window === "undefined") return;

  const originalFetch = window.fetch;

  window.fetch = async (input, init = {}) => {
    if (init?.headers) {
      const headers = new Headers(init.headers);

      const auth = headers.get("Authorization");
      if (auth) {
        // Strip ALL non-ASCII characters (more restrictive, safer)
        const cleaned = auth.replace(/[^\x20-\x7E]/g, "");
        if (cleaned !== auth) {
          console.warn("🧹 Sanitized Authorization header");
          headers.set("Authorization", cleaned);
        }
      }

      init = {
        ...init,
        headers,
      };
    }

    return originalFetch(input, init);
  };

  console.log("🛡️ Fetch sanitizer installed");
}

