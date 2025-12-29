/**
 * Safe fetch wrapper that sanitizes Authorization headers BEFORE Headers construction
 * Strips all non-ASCII characters to prevent Headers() construction failures
 * This must sanitize BEFORE new Headers() is called
 */

export const supabaseSafeFetch: typeof fetch = async (input, init) => {
  // Sanitize headers BEFORE creating Headers object
  if (init?.headers) {
    let sanitizedHeaders: HeadersInit;
    
    // Convert headers to plain object first to sanitize
    if (init.headers instanceof Headers) {
      const headersObj: Record<string, string> = {};
      init.headers.forEach((value, key) => {
        if (key.toLowerCase() === "authorization") {
          // Strip ALL non-ASCII characters BEFORE Headers construction
          headersObj[key] = value.replace(/[^\x20-\x7E]/g, "");
        } else {
          headersObj[key] = value;
        }
      });
      sanitizedHeaders = headersObj;
    } else if (Array.isArray(init.headers)) {
      sanitizedHeaders = init.headers.map(([key, value]): [string, string] => [
        key,
        key.toLowerCase() === "authorization"
          ? String(value).replace(/[^\x20-\x7E]/g, "")
          : String(value),
      ]);
    } else {
      const headersObj: Record<string, string> = {};
      for (const [key, value] of Object.entries(init.headers)) {
        if (key.toLowerCase() === "authorization") {
          // Strip ALL non-ASCII characters BEFORE Headers construction
          headersObj[key] = String(value).replace(/[^\x20-\x7E]/g, "");
        } else {
          headersObj[key] = String(value);
        }
      }
      sanitizedHeaders = headersObj;
    }

    init = {
      ...init,
      headers: sanitizedHeaders,
    };
  }

  return fetch(input, init);
};

