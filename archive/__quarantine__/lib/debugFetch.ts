/**
 * Debug fetch interceptor to detect headers with non-ISO-8859-1 characters
 * This will throw an error with a stack trace when invalid headers are detected
 */
export function installFetchDebug() {
  if (typeof window === "undefined") return;

  const originalFetch = window.fetch;

  window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
    if (init && init.headers) {
      // Check if headers contain non-ISO-8859-1 characters
      const headers = init.headers;
      let hasInvalidChars = false;
      let invalidHeader: string | null = null;

      if (headers instanceof Headers) {
        headers.forEach((value, key) => {
          // Check if header key or value contains non-ISO-8859-1 characters
          if (!isValidISO88591(key) || !isValidISO88591(value)) {
            hasInvalidChars = true;
            invalidHeader = `${key}: ${value}`;
          }
        });
      } else if (Array.isArray(headers)) {
        for (const [key, value] of headers) {
          if (!isValidISO88591(key) || !isValidISO88591(value)) {
            hasInvalidChars = true;
            invalidHeader = `${key}: ${value}`;
            break;
          }
        }
      } else if (typeof headers === 'object') {
        for (const [key, value] of Object.entries(headers)) {
          const headerValue = Array.isArray(value) ? value.join(', ') : String(value);
          if (!isValidISO88591(key) || !isValidISO88591(headerValue)) {
            hasInvalidChars = true;
            invalidHeader = `${key}: ${headerValue}`;
            break;
          }
        }
      }

      if (hasInvalidChars) {
        console.error("❌ INVALID FETCH HEADERS (non-ISO-8859-1 characters detected)", {
          invalidHeader,
          headers,
          input,
          stack: new Error().stack
        });
        throw new Error(`Browser fetch called with headers containing non-ISO-8859-1 characters: ${invalidHeader}`);
      }
    }
    return originalFetch.apply(this, arguments as any);
  };
}

/**
 * Check if a string contains only ISO-8859-1 characters
 */
function isValidISO88591(str: string): boolean {
  // ISO-8859-1 is 8-bit encoding: 0x00-0xFF
  // But we're checking for characters that can be encoded in ISO-8859-1
  // Non-ISO-8859-1 characters include: emojis, most Unicode characters > 0xFF
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    // Characters outside 0x00-0xFF range are likely problematic
    // Also check for common non-ISO-8859-1 characters like emojis
    if (code > 0xFF || (code >= 0xD800 && code <= 0xDFFF)) { // Surrogate pairs (emojis)
      return false;
    }
  }
  return true;
}

