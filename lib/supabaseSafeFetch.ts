/**
 * Safe fetch wrapper that sanitizes Authorization headers
 * Strips all non-ASCII characters to prevent Headers() construction failures
 */

export const supabaseSafeFetch: typeof fetch = async (input, init) => {
  if (init?.headers) {
    const headers = new Headers(init.headers);

    const auth = headers.get("Authorization");
    if (auth) {
      // Strip ALL non-ASCII characters
      const cleaned = auth.replace(/[^\x20-\x7E]/g, "");
      headers.set("Authorization", cleaned);
    }

    init = {
      ...init,
      headers,
    };
  }

  return fetch(input, init);
};

