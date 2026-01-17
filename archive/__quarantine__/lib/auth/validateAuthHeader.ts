/**
 * Hard fail guard for invalid Authorization headers
 * Prevents non-ISO-8859-1 character crashes in fetch
 * 
 * DO NOT attempt to sanitize - fail fast instead
 */

/**
 * Check if a string contains only ISO-8859-1 characters
 */
function isISO88591(str: string): boolean {
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    // ISO-8859-1 range: 0x00-0xFF
    if (code > 0xFF) {
      return false;
    }
  }
  return true;
}

/**
 * Validate Authorization header before use
 * Throws if header contains non-ISO-8859-1 characters
 */
export function validateAuthHeader(token: string | null | undefined): void {
  if (!token) {
    return; // Empty/null is valid
  }

  if (!isISO88591(token)) {
    throw new Error(
      'CRITICAL: Authorization header contains non-ISO-8859-1 characters. ' +
      'This will cause browser fetch crash. Token must be cleared.'
    );
  }
}

/**
 * Validate auth token before Supabase auth calls
 * Call this BEFORE any supabase.auth.* operation
 */
export function validateAuthTokenBeforeUse(token: string | null | undefined): void {
  validateAuthHeader(token);
}

