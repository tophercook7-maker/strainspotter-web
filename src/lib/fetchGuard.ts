/**
 * Safe fetch guard - prevents invalid headers in browser fetch calls
 * This helps catch cases where headers with non-ISO-8859-1 characters are passed
 */
export function safeFetch(input: RequestInfo, init?: RequestInit) {
  if (init?.headers) {
    console.error("❌ INVALID FETCH HEADERS DETECTED:", init.headers);
    throw new Error("Browser fetch called with headers — this is illegal here");
  }
  return fetch(input, init);
}

