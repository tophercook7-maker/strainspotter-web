"use client";

/**
 * Strips non-ISO-8859-1 characters from Authorization headers.
 * Prevents browser fetch crashes caused by corrupted tokens.
 */
export function installFetchSanitizer() {
  if (typeof window === "undefined") return;

  const originalFetch = window.fetch;

  window.fetch = async (input, init = {}) => {
    if (init.headers) {
      const headers =
        init.headers instanceof Headers
          ? init.headers
          : new Headers(init.headers);

      const auth = headers.get("Authorization");
      if (auth) {
        const cleaned = auth.replace(/[^\x20-\x7E]+/g, "").trim();
        if (cleaned !== auth) {
          console.warn("🧹 Sanitized Authorization header");
          headers.set("Authorization", cleaned);
        }
      }

      init.headers = headers;
    }

    return originalFetch(input, init);
  };

  console.log("🛡️ Fetch sanitizer installed");
}

